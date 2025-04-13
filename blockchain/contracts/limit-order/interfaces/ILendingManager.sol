// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ILendingManager
 * @notice Interface for the LendingManager contract
 */
interface ILendingManager {
    /**
     * @notice Deposits tokens to the lending protocol with highest yield
     * @param token Token address
     * @param amount Amount to deposit
     * @return positionId ID of the created position
     */
    function depositToHighestYieldPool(
        address token,
        uint256 amount
    ) external returns (uint256);

    /**
     * @notice Withdraws tokens from lending protocol
     * @param positionId ID of the position to withdraw
     * @param token Token address (for verification)
     * @return Amount withdrawn including interest
     */
    function withdrawFromPool(
        uint256 positionId,
        address token
    ) external returns (uint256);

    /**
     * @notice Checks for better yields and switches protocols if needed
     * @param positionId Position ID to optimize
     * @return New position ID if switched, same ID if not
     */
    function optimizeYield(uint256 positionId) external returns (uint256);

    /**
     * @notice Gets the current yield for a token on a lending protocol
     * @param protocol Protocol address
     * @param token Token address
     * @return Yield in APY basis points (e.g., 500 = 5% APY)
     */
    function getProtocolYield(
        address protocol,
        address token
    ) external view returns (uint256);

    /**
     * @notice Finds the lending protocol with highest yield for a token
     * @param token Token address
     * @return Protocol address with highest yield
     */
    function getBestProtocolForToken(
        address token
    ) external view returns (address);
}
