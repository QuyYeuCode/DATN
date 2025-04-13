// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ILendingProtocol
 * @notice Interface for interacting with lending protocols
 */
interface ILendingProtocol {
    /**
     * @notice Deposits tokens into the lending protocol
     * @param token Token address
     * @param amount Amount to deposit
     * @return Amount of tokens actually deposited
     */
    function deposit(address token, uint256 amount) external returns (uint256);

    /**
     * @notice Withdraws tokens from the lending protocol
     * @param token Token address
     * @param amount Amount to withdraw
     * @return Amount of tokens actually withdrawn (including interest)
     */
    function withdraw(address token, uint256 amount) external returns (uint256);

    /**
     * @notice Gets the current balance of deposited tokens including interest
     * @param token Token address
     * @param account Account address
     * @param depositAmount Original deposit amount
     * @return Current balance including interest
     */
    function getBalance(
        address token,
        address account,
        uint256 depositAmount
    ) external view returns (uint256);

    /**
     * @notice Gets the current APY for a token
     * @param token Token address
     * @return APY in basis points (e.g., 500 = 5%)
     */
    function getAPY(address token) external view returns (uint256);

    /**
     * @notice Checks if the protocol supports a token
     * @param token Token address
     * @return Whether the token is supported
     */
    function supportsToken(address token) external view returns (bool);
}
