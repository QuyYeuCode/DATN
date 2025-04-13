// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceOracle
 * @notice Provides price data for tokens using Chainlink price feeds
 */
contract PriceOracle is Ownable {
    // Maps token pair to price feed address
    mapping(address => mapping(address => address)) public priceFeedAddresses;

    // Token decimals
    mapping(address => uint8) public tokenDecimals;

    // Events
    event PriceFeedSet(
        address indexed tokenIn,
        address indexed tokenOut,
        address priceFeed
    );
    event TokenDecimalsSet(address indexed token, uint8 decimals);

    /**
     * @notice Sets a price feed for a token pair
     * @param _tokenIn Input token
     * @param _tokenOut Output token
     * @param _priceFeedAddress Address of the Chainlink price feed
     */
    function setPriceFeed(
        address _tokenIn,
        address _tokenOut,
        address _priceFeedAddress
    ) external onlyOwner {
        require(_tokenIn != address(0), "Invalid input token");
        require(_tokenOut != address(0), "Invalid output token");
        require(_priceFeedAddress != address(0), "Invalid price feed address");

        priceFeedAddresses[_tokenIn][_tokenOut] = _priceFeedAddress;

        emit PriceFeedSet(_tokenIn, _tokenOut, _priceFeedAddress);
    }

    /**
     * @notice Sets the decimals for a token
     * @param _token Token address
     * @param _decimals Number of decimals
     */
    function setTokenDecimals(
        address _token,
        uint8 _decimals
    ) external onlyOwner {
        require(_token != address(0), "Invalid token address");

        tokenDecimals[_token] = _decimals;

        emit TokenDecimalsSet(_token, _decimals);
    }

    /**
     * @notice Gets the latest price for a token pair
     * @param _tokenIn Input token
     * @param _tokenOut Output token
     * @return price The latest price (scaled by 1e18)
     */
    function getPrice(
        address _tokenIn,
        address _tokenOut
    ) public view returns (uint256) {
        address priceFeedAddress = priceFeedAddresses[_tokenIn][_tokenOut];

        // Check if we have a direct price feed
        if (priceFeedAddress != address(0)) {
            return getPriceFromFeed(priceFeedAddress);
        }

        // Check if we have a reverse price feed
        priceFeedAddress = priceFeedAddresses[_tokenOut][_tokenIn];
        if (priceFeedAddress != address(0)) {
            uint256 reversePrice = getPriceFromFeed(priceFeedAddress);
            return calculateReciprocalPrice(reversePrice);
        }

        // If no direct or reverse feed, revert
        revert("No price feed available");
    }

    /**
     * @notice Gets price from a Chainlink price feed
     * @param _priceFeedAddress Address of the price feed
     * @return price The latest price (scaled by 1e18)
     */
    function getPriceFromFeed(
        address _priceFeedAddress
    ) internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            _priceFeedAddress
        );

        (, /* uint80 roundID */ int256 price, , , ) = /* uint startedAt */ /* uint timeStamp */ /* uint80 answeredInRound */
        priceFeed.latestRoundData();

        require(price > 0, "Invalid price");

        // Convert to 18 decimals
        uint8 decimals = priceFeed.decimals();
        if (decimals < 18) {
            return uint256(price) * 10 ** (18 - decimals);
        } else if (decimals > 18) {
            return uint256(price) / 10 ** (decimals - 18);
        }

        return uint256(price);
    }

    /**
     * @notice Calculates the reciprocal of a price
     * @param _price Original price (scaled by 1e18)
     * @return reciprocalPrice The reciprocal price (scaled by 1e18)
     */
    function calculateReciprocalPrice(
        uint256 _price
    ) internal pure returns (uint256) {
        require(_price > 0, "Price cannot be zero");
        return (1e36) / _price;
    }

    /**
     * @notice Checks if the current price meets a target price condition
     * @param _tokenIn Input token
     * @param _tokenOut Output token
     * @param _targetPrice Target price (scaled by 1e18)
     * @param _isBuyOrder True if buying tokenOut, false if selling tokenIn
     * @return meetsCondition Whether the condition is met
     */
    function checkPriceCondition(
        address _tokenIn,
        address _tokenOut,
        uint256 _targetPrice,
        bool _isBuyOrder
    ) external view returns (bool) {
        uint256 currentPrice = getPrice(_tokenIn, _tokenOut);

        if (_isBuyOrder) {
            // For buy orders, the current price should be less than or equal to target
            return currentPrice <= _targetPrice;
        } else {
            // For sell orders, the current price should be greater than or equal to target
            return currentPrice >= _targetPrice;
        }
    }
}
