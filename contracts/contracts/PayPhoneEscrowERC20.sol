// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @notice USDC / stablecoin escrow — atomic settlement with 5% platform fee.
 */
contract PayPhoneEscrowERC20 {
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable token;
    address public immutable platformRecipient;

    struct Escrow {
        address client;
        address provider;
        uint256 ratePerSecond;
        uint256 maxDuration;
        uint256 minBillableSeconds;
        uint256 amount;
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

    constructor(IERC20 _token, address _platformRecipient) {
        require(address(_token) != address(0) && _platformRecipient != address(0), "bad");
        token = _token;
        platformRecipient = _platformRecipient;
    }

    function createEscrow(
        bytes32 sessionId,
        address provider,
        uint256 ratePerSecond,
        uint256 maxDuration,
        uint256 minBillableSeconds,
        uint256 amount
    ) external {
        require(escrows[sessionId].client == address(0), "exists");
        require(provider != address(0) && amount > 0, "bad");

        if (!token.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        escrows[sessionId] = Escrow({
            client: msg.sender,
            provider: provider,
            ratePerSecond: ratePerSecond,
            maxDuration: maxDuration,
            minBillableSeconds: minBillableSeconds,
            amount: amount,
            released: false,
            disputed: false
        });

        emit EscrowCreated(
            sessionId,
            msg.sender,
            provider,
            ratePerSecond,
            maxDuration,
            amount
        );
    }

    function settleCall(bytes32 sessionId, uint256 actualDuration) external {
        Escrow storage e = escrows[sessionId];
        if (e.client == address(0)) revert UnknownSession();
        if (e.released) revert AlreadyReleased();
        if (actualDuration > e.maxDuration) revert InvalidDuration();

        uint256 billable = actualDuration < e.minBillableSeconds ? 0 : actualDuration;
        uint256 gross = e.ratePerSecond * billable;
        if (gross > e.amount) revert InvalidDuration();

        uint256 platformFee = (gross * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netToProvider = gross - platformFee;
        uint256 refund = e.amount - gross;

        e.released = true;

        if (!token.transfer(e.provider, netToProvider)) revert TransferFailed();
        if (!token.transfer(platformRecipient, platformFee)) revert TransferFailed();
        if (!token.transfer(e.client, refund)) revert TransferFailed();

        emit CallSettled(sessionId, netToProvider, platformFee, refund);
    }

    function markDisputed(bytes32 sessionId) external {
        Escrow storage e = escrows[sessionId];
        if (e.client == address(0)) revert UnknownSession();
        e.disputed = true;
        emit EscrowDisputed(sessionId);
    }
}
