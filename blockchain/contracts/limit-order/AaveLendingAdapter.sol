// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILendingProtocol.sol";

/**
 * @title AaveLendingAdapter
 * @notice Adapter for Aave lending protocol
 */
contract AaveLendingAdapter is ILendingProtocol, Ownable {
    using SafeERC20 for IERC20;

    // Aave LendingPool contract address
    address public lendingPool;

    // Mapping from underlying token to aToken
    mapping(address => address) public aTokens;

    // Supported tokens
    mapping(address => bool) public supportedTokensMap;
    address[] public supportedTokensList;

    // Events
    event TokenAdded(address token, address aToken);
    event TokenRemoved(address token);
    event LendingPoolUpdated(address oldPool, address newPool);

    /**
     * @notice Constructor
     * @param _lendingPool Aave lending pool address
     */
    constructor(address _lendingPool) {
        require(_lendingPool != address(0), "Invalid lending pool");
        lendingPool = _lendingPool;
    }

    /**
     * @notice Deposits tokens into Aave
     * @param token Token address
     * @param amount Amount to deposit
     * @return Amount of tokens actually deposited
     */
    function deposit(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        require(supportsToken(token), "Token not supported");

        // Transfer tokens from sender if needed
        if (msg.sender != owner()) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Approve lending pool to spend tokens
        IERC20(token).safeApprove(lendingPool, 0);
        IERC20(token).safeApprove(lendingPool, amount);

        // Get balance before deposit
        uint256 aTokenBalanceBefore = IERC20(aTokens[token]).balanceOf(
            address(this)
        );

        // Deposit to Aave
        // Note: In a real implementation, this would be a call to Aave's deposit function
        // (lendingPool.deposit(token, amount, address(this), 0))

        // Get balance after deposit
        uint256 aTokenBalanceAfter = IERC20(aTokens[token]).balanceOf(
            address(this)
        );

        return aTokenBalanceAfter - aTokenBalanceBefore;
    }

    /**
     * @notice Withdraws tokens from Aave
     * @param token Token address
     * @param amount Amount to withdraw
     * @return Amount of tokens actually withdrawn
     */
    function withdraw(
        address token,
        uint256 amount
    ) external override returns (uint256) {
        require(supportsToken(token), "Token not supported");

        // Get balance before withdrawal
        uint256 tokenBalanceBefore = IERC20(token).balanceOf(address(this));

        // Withdraw from Aave
        // Note: In a real implementation, this would be a call to Aave's withdraw function
        // (lendingPool.withdraw(token, amount, address(this)))

        // Get balance after withdrawal
        uint256 tokenBalanceAfter = IERC20(token).balanceOf(address(this));
        uint256 withdrawnAmount = tokenBalanceAfter - tokenBalanceBefore;

        // Transfer tokens to sender if needed
        if (msg.sender != owner()) {
            IERC20(token).safeTransfer(msg.sender, withdrawnAmount);
        }

        return withdrawnAmount;
    }

    /**
     * @notice Gets the current balance including interest
     * @param token Token address
     * @param account Account address (not used in this adapter)
     * @param depositAmount Original deposit amount (not used in this adapter)
     * @return Current balance including interest
     */
    function getBalance(
        address token,
        address, // account
        uint256 // depositAmount
    ) external view override returns (uint256) {
        require(supportsToken(token), "Token not supported");

        // In Aave, the balance is represented by aToken balance
        return IERC20(aTokens[token]).balanceOf(address(this));
    }

    /**
     * @notice Gets the current APY for a token
     * @param token Token address
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getAPY(address token) external view override returns (uint256) {
        require(supportsToken(token), "Token not supported");

        // Note: In a real implementation, this would query the Aave protocol
        // for the current deposit APY
        // This is a placeholder implementation
        return 500; // 5% APY
    }

    /**
     * @notice Checks if the protocol supports a token
     * @param token Token address
     * @return Whether the token is supported
     */
    function supportsToken(address token) public view override returns (bool) {
        return supportedTokensMap[token];
    }

    /**
     * @notice Gets all supported tokens
     * @return Array of supported token addresses
     */
    function getAllSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    // Admin functions

    /**
     * @notice Adds a supported token
     * @param token Underlying token address
     * @param aToken aToken address
     */
    function addSupportedToken(
        address token,
        address aToken
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(aToken != address(0), "Invalid aToken");
        require(!supportedTokensMap[token], "Token already supported");

        supportedTokensMap[token] = true;
        supportedTokensList.push(token);
        aTokens[token] = aToken;

        emit TokenAdded(token, aToken);
    }

    /**
     * @notice Removes a supported token
     * @param token Token address
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokensMap[token], "Token not supported");

        // Remove from array
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == token) {
                supportedTokensList[i] = supportedTokensList[
                    supportedTokensList.length - 1
                ];
                supportedTokensList.pop();
                break;
            }
        }

        delete aTokens[token];
        supportedTokensMap[token] = false;

        emit TokenRemoved(token);
    }

    /**
     * @notice Updates the lending pool address
     * @param _lendingPool New lending pool address
     */
    function updateLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "Invalid lending pool");

        address oldPool = lendingPool;
        lendingPool = _lendingPool;

        emit LendingPoolUpdated(oldPool, _lendingPool);
    }

    /**
     * @notice Rescues stuck tokens
     * @param token Token address
     * @param to Address to send tokens to
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
