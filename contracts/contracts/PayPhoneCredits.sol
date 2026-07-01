// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @notice Pay screen — users top up comms + Filecoin storage credits in USDC.
 */
contract PayPhoneCredits {
    IERC20 public immutable token;
    address public immutable platformRecipient;

    uint256 public constant STORAGE_CREDIT_PER_USDC = 1e9; // 1 GiB-month per USDC (scaled)
    uint256 public constant COMMS_CREDIT_PER_USDC = 1000; // comms units per USDC

    struct AccountCredits {
        uint256 storageGibMonths;
        uint256 commsUnits;
    }

    mapping(address => AccountCredits) public credits;

    event CreditsPurchased(
        address indexed user,
        uint256 usdcPaid,
        uint256 storageGibMonths,
        uint256 commsUnits
    );
    event StorageConsumed(address indexed user, uint256 gibMonths);
    event CommsConsumed(address indexed user, uint256 units);

    error TransferFailed();
    error InsufficientStorage();
    error InsufficientComms();

    constructor(IERC20 _token, address _platformRecipient) {
        require(address(_token) != address(0) && _platformRecipient != address(0), "bad");
        token = _token;
        platformRecipient = _platformRecipient;
    }

    function purchaseCredits(uint256 usdcAmount) external {
        require(usdcAmount > 0, "amount");
        if (!token.transferFrom(msg.sender, platformRecipient, usdcAmount)) revert TransferFailed();

        uint256 storageAdd = usdcAmount * STORAGE_CREDIT_PER_USDC / 1e6;
        uint256 commsAdd = usdcAmount * COMMS_CREDIT_PER_USDC / 1e6;

        AccountCredits storage c = credits[msg.sender];
        c.storageGibMonths += storageAdd;
        c.commsUnits += commsAdd;

        emit CreditsPurchased(msg.sender, usdcAmount, storageAdd, commsAdd);
    }

    function consumeStorage(uint256 gibMonths) external {
        AccountCredits storage c = credits[msg.sender];
        if (c.storageGibMonths < gibMonths) revert InsufficientStorage();
        c.storageGibMonths -= gibMonths;
        emit StorageConsumed(msg.sender, gibMonths);
    }

    function consumeComms(uint256 units) external {
        AccountCredits storage c = credits[msg.sender];
        if (c.commsUnits < units) revert InsufficientComms();
        c.commsUnits -= units;
        emit CommsConsumed(msg.sender, units);
    }

    function quotePurchase(uint256 usdcAmount) external pure returns (uint256 storageGibMonths, uint256 commsUnits) {
        storageGibMonths = usdcAmount * STORAGE_CREDIT_PER_USDC / 1e6;
        commsUnits = usdcAmount * COMMS_CREDIT_PER_USDC / 1e6;
    }
}
