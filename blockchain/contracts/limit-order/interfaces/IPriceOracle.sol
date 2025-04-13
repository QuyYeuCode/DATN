// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IPriceOracle
 * @notice Interface for the price and yield oracle
 */
interface IPriceOracle {
    /**
     * @notice Gets the price of a token in USD
     * @param token Token address
     * @return Price in USD (scaled by 1e18)
     */
    function getPrice(address token) external view returns (uint256);

    /**
     * @notice Gets the APY for a token on a specific lending protocol
     * @param protocol Protocol address
     * @param token Token address
     * @return APY in basis points (e.g., 500 = 5% APY)
     */
    function getAPY(
        address protocol,
        address token
    ) external view returns (uint256);
}
