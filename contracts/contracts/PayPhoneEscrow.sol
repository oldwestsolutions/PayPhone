// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PayPhoneEscrow
 * @notice Session-scoped escrow with 5% platform fee (500 bps), 95% to provider.
 * @dev Parent ecosystems supply `platformRecipient`; payphone.cc never custodies funds.
 */
contract PayPhoneEscrow {
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    address public immutable platformRecipient;

    struct Escrow {
        address client;
        address provider;
        uint256 ratePerSecond; // smallest USDC unit (wei) per second
        uint256 maxDuration; // seconds
        uint256 amount; // total escrowed (includes platform fee float)
        bool released;
        bool disputed;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(
        bytes32 indexed sessionId,
        address indexed client,
        address indexed provider,
        uint256 ratePerSecond,
        uint256 maxDuration,
        uint256 amount
    );
    event CallSettled(
        bytes32 indexed sessionId,
        uint256 grossToProvider,
        uint256 platformFee,
        uint256 refundToClient
    );
    event EscrowDisputed(bytes32 indexed sessionId);

    error AlreadyReleased();
    error InvalidDuration();
    error TransferFailed();
    error UnknownSession();

    constructor(address _platformRecipient) {
        require(_platformRecipient != address(0), "platform");
        platformRecipient = _platformRecipient;
    }

    function createEscrow(
        bytes32 sessionId,
        address provider,
        uint256 ratePerSecond,
        uint256 maxDuration
    ) external payable {
        require(escrows[sessionId].client == address(0), "exists");
        require(provider != address(0) && msg.value > 0, "bad");

        escrows[sessionId] = Escrow({
            client: msg.sender,
            provider: provider,
            ratePerSecond: ratePerSecond,
            maxDuration: maxDuration,
            amount: msg.value,
            released: false,
            disputed: false
        });

        emit EscrowCreated(
            sessionId,
            msg.sender,
            provider,
            ratePerSecond,
            maxDuration,
            msg.value
        );
    }

    /**
     * @param actualDuration seconds of billable time (validated off-chain within ±5s window in MVP)
     */
    function settleCall(
        bytes32 sessionId,
        uint256 actualDuration
    ) external {
        Escrow storage e = escrows[sessionId];
        if (e.client == address(0)) revert UnknownSession();
        if (e.released) revert AlreadyReleased();
        if (actualDuration > e.maxDuration) revert InvalidDuration();

        uint256 gross = e.ratePerSecond * actualDuration;
        if (gross > e.amount) revert InvalidDuration();

        uint256 platformFee = (gross * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netToProvider = gross - platformFee;
        uint256 refund = e.amount - gross;

        e.released = true;

        _send(e.provider, netToProvider);
        _send(platformRecipient, platformFee);
        _send(e.client, refund);

        emit CallSettled(sessionId, netToProvider, platformFee, refund);
    }

    /**
     * @notice Move escrow to disputed state; release requires arbitrator (ecosystem policy).
     */
    function markDisputed(bytes32 sessionId) external {
        Escrow storage e = escrows[sessionId];
        if (e.client == address(0)) revert UnknownSession();
        e.disputed = true;
        emit EscrowDisputed(sessionId);
    }

    function _send(address to, uint256 amt) internal {
        if (amt == 0) return;
        (bool ok, ) = to.call{value: amt}("");
        if (!ok) revert TransferFailed();
    }
}
