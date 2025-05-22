import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import {
  TokenInfo,
  SwapParams,
  getTokenList,
  getTokenPrice,
  calculateAmountOut,
  calculateAmountIn,
  executeSwap,
  setupPriceUpdater,
  getSwapQuote,
} from "../service/SwapService";

// Token dropdown that fixes positioning and scrolling issues
const TokenDropdown = ({
  isOpen,
  tokens,
  onSelect,
  onClose,
  searchPlaceholder = "Search token name...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Filter tokens based on search term
  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-56 bg-gray-800 rounded-xl shadow-lg z-20 border border-gray-700"
      style={{ maxHeight: "320px", overflowY: "auto" }}
    >
      <div className="p-2">
        <div className="mb-2 px-3 py-2">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredTokens.map((token) => (
            <div
              key={token.address}
              className="flex items-center px-3 py-2.5 hover:bg-gray-700 cursor-pointer rounded-lg my-0.5"
              onClick={() => {
                onSelect(token);
                onClose();
              }}
            >
              <img
                src={token.icon}
                alt={token.symbol}
                className="w-7 h-7 rounded-full mr-3"
              />
              <div>
                <div className="text-white font-medium">{token.symbol}</div>
                <div className="text-gray-400 text-xs">{token.name}</div>
              </div>
            </div>
          ))}
          {filteredTokens.length === 0 && (
            <div className="px-3 py-4 text-gray-400 text-center">
              No tokens found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SwapToken = ({ onSwap }) => {
  const { account, isConnected } = useWallet();
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellToken, setSellToken] = useState(null);
  const [buyToken, setBuyToken] = useState(null);
  const [showSellTokens, setShowSellTokens] = useState(false);
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [availableTokens, setAvailableTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [slippage, setSlippage] = useState(0.5);
  const [deadlineMinutes, setDeadlineMinutes] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const priceUpdaterRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsBtnRef = useRef(null);
  const sellTokenBtnRef = useRef(null);
  const buyTokenBtnRef = useRef(null);

  // Fetch token list on component mount
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        // Mock token data for demo
        const tokens = [
          {
            address: "0xEth123",
            name: "Ethereum",
            symbol: "ETH",
            icon: "/api/placeholder/24/24",
          },
          {
            address: "0xBtc123",
            name: "Bitcoin",
            symbol: "BTC",
            icon: "/api/placeholder/24/24",
          },
          {
            address: "0xUsdt123",
            name: "Tether",
            symbol: "USDT",
            icon: "/api/placeholder/24/24",
          },
          {
            address: "0xDai123",
            name: "DAI",
            symbol: "DAI",
            icon: "/api/placeholder/24/24",
          },
          {
            address: "0xUsdc123",
            name: "USD Coin",
            symbol: "USDC",
            icon: "/api/placeholder/24/24",
          },
        ];
        // const tokens = await getTokenList();
        setAvailableTokens(tokens);

        // Set default tokens
        if (tokens.length >= 2) {
          setSellToken(tokens[0]);
          setBuyToken(tokens[1]);
        }
      } catch (error) {
        console.error("Error fetching token list:", error);
        setError("Could not retrieve token list. Please try again later.");
      }
    };

    fetchTokens();
  }, []);

  // Handle click outside to close settings
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target) &&
        !settingsBtnRef.current?.contains(event.target)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update token price when sellToken or buyToken changes
  useEffect(() => {
    if (sellToken && buyToken) {
      // Clear previous price updater
      if (priceUpdaterRef.current) {
        priceUpdaterRef.current();
      }

      // Mock price updater for demo
      const mockPrice = Math.random() * 20 + 1;
      setCurrentPrice(mockPrice);
      setLastUpdated(new Date());

      // Setup new price updater
      /*
      priceUpdaterRef.current = setupPriceUpdater(
        sellToken.address,
        buyToken.address,
        (price) => {
          setCurrentPrice(price);
          setLastUpdated(new Date());

          // Update corresponding value if input exists
          if (sellAmount && parseFloat(sellAmount) > 0) {
            updateBuyAmount(sellAmount);
          } else if (buyAmount && parseFloat(buyAmount) > 0) {
            updateSellAmount(buyAmount);
          }
        }
      );
      */
    }

    return () => {
      // Cleanup price updater when component unmounts or tokens change
      if (priceUpdaterRef.current) {
        priceUpdaterRef.current();
      }
    };
  }, [sellToken, buyToken]);

  const updateBuyAmount = async (amount) => {
    if (!sellToken || !buyToken || !amount || parseFloat(amount) === 0) {
      setBuyAmount("");
      return;
    }

    try {
      setIsLoading(true);
      // Mock calculation for demo
      const amountOut = (parseFloat(amount) * currentPrice).toFixed(6);
      setBuyAmount(amountOut);
      /*
      const amountOut = await calculateAmountOut(
        sellToken.address,
        buyToken.address,
        amount
      );
      setBuyAmount(amountOut);
      */
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating output amount:", error);
      setIsLoading(false);
    }
  };

  const updateSellAmount = async (amount) => {
    if (!sellToken || !buyToken || !amount || parseFloat(amount) === 0) {
      setSellAmount("");
      return;
    }

    try {
      setIsLoading(true);
      // Mock calculation for demo
      const amountIn = (parseFloat(amount) / currentPrice).toFixed(6);
      setSellAmount(amountIn);
      /*
      const amountIn = await calculateAmountIn(
        sellToken.address,
        buyToken.address,
        amount
      );
      setSellAmount(amountIn);
      */
      setIsLoading(false);
    } catch (error) {
      console.error("Error calculating input amount:", error);
      setIsLoading(false);
    }
  };

  const handleSellAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setSellAmount(value);
    updateBuyAmount(value);
  };

  const handleBuyAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setBuyAmount(value);
    updateSellAmount(value);
  };

  const handleTokenSelect = (type, token) => {
    if (type === "sell") {
      // Don't allow selecting the same token
      if (buyToken && token.address === buyToken.address) {
        setBuyToken(sellToken);
      }
      setSellToken(token);
    } else {
      // Don't allow selecting the same token
      if (sellToken && token.address === sellToken.address) {
        setSellToken(buyToken);
      }
      setBuyToken(token);
    }

    // Reset amounts when tokens change
    setSellAmount("");
    setBuyAmount("");
  };

  const toggleDirection = () => {
    // Swap sell and buy tokens
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);

    // Swap amounts
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  const handleSlippageChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      setSlippage(value);
    }
  };

  const handleDeadlineChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setDeadlineMinutes(value);
    }
  };

  const handleSwap = async () => {
    if (!sellToken || !buyToken || !sellAmount || !buyAmount || !isConnected) {
      if (!isConnected) {
        setError("Please connect your wallet before trading");
      } else {
        setError("Please fill in all trade information");
      }
      return;
    }

    try {
      setIsSwapping(true);
      setError("");

      const params = {
        tokenIn: sellToken.address,
        tokenOut: buyToken.address,
        amountIn: sellAmount,
        slippage: slippage,
        deadlineMinutes: deadlineMinutes,
      };

      // Mock quote
      setPriceImpact(0.05);
      // const quote = await getSwapQuote(params);
      // setPriceImpact(quote.priceImpact);

      // Mock swap execution
      const txHash = "0x123...abc";
      // const txHash = await executeSwap(params);

      // Call callback if exists
      if (onSwap) {
        onSwap(sellAmount, buyAmount, sellToken.symbol, buyToken.symbol);
      }

      // Reset form after successful swap
      setSellAmount("");
      setBuyAmount("");
      setIsSwapping(false);

      // Show success message
      alert(`Transaction successful! Hash: ${txHash}`);
    } catch (error) {
      console.error("Error during swap:", error);
      setError("Transaction failed. Please try again later.");
      setIsSwapping(false);
    }
  };

  // Slippage presets
  const slippagePresets = [0.1, 0.5, 1, 3];

  return (
    <div className="w-full max-w-md mx-auto mt-8 relative">
      {/* Settings Panel */}
      {showSettings && (
        <div
          ref={settingsRef}
          className="absolute z-20 w-full bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-3 transform -translate-y-2 transition-all duration-200 ease-in-out"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-medium">
                Transaction Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-300 text-sm font-medium">
                  Slippage Tolerance
                </label>
                <div className="text-pink-500 text-sm font-medium">
                  {slippage}%
                </div>
              </div>
              <div className="flex space-x-2 mb-2">
                {slippagePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSlippage(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      slippage === preset
                        ? "bg-pink-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    } transition-colors`}
                  >
                    {preset}%
                  </button>
                ))}
                <button
                  onClick={() => setSlippage(5)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    slippage > 3 && !slippagePresets.includes(slippage)
                      ? "bg-pink-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } transition-colors`}
                >
                  Custom
                </button>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={slippage}
                onChange={handleSlippageChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.1%</span>
                <span>10%</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-1">
                  {slippage > 5
                    ? "⚠️ High slippage increases the risk of front-running"
                    : slippage < 0.5
                    ? "⚠️ Low slippage increases the chance of failed transactions"
                    : "✓ Recommended slippage for most trades"}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-300 text-sm font-medium">
                  Transaction Deadline
                </label>
                <div className="text-pink-500 text-sm font-medium">
                  {deadlineMinutes} min
                </div>
              </div>
              <div className="flex space-x-2 mb-2">
                {[10, 20, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDeadlineMinutes(mins)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      deadlineMinutes === mins
                        ? "bg-pink-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    } transition-colors`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={deadlineMinutes}
                onChange={handleDeadlineChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 min</span>
                <span>60 min</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Swap Card */}
      <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="p-5 flex justify-between items-center bg-gray-900">
          <h2 className="text-white text-xl font-semibold">Swap</h2>
          <button
            ref={settingsBtnRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`text-gray-300 hover:text-white p-2 rounded-lg transition-all duration-200 ${
              showSettings ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
        {/* Sell token section */}
        <div className="p-5 bg-gray-800 mx-2 mt-3 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <div className="text-gray-300 text-base font-medium">Sell</div>
            {sellToken && account && (
              <div className="text-gray-400 text-sm font-medium px-2.5 py-0.5 bg-gray-700 rounded-full">
                Balance: 0.00
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={sellAmount}
              onChange={handleSellAmountChange}
              placeholder="0"
              className="bg-transparent text-white text-4xl font-light focus:outline-none w-3/5"
              disabled={isSwapping}
            />
            <div className="relative">
              <button
                ref={sellTokenBtnRef}
                onClick={() => {
                  setShowSellTokens(!showSellTokens);
                  setShowBuyTokens(false); // Close the other dropdown
                }}
                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 rounded-xl pl-3 pr-2 py-2 text-white transition-colors duration-200"
                disabled={isSwapping}
              >
                {sellToken ? (
                  <>
                    <img
                      src={sellToken.icon}
                      alt={sellToken.symbol}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span className="font-medium">{sellToken.symbol}</span>
                  </>
                ) : (
                  <span>Select token</span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <TokenDropdown
                isOpen={showSellTokens}
                tokens={availableTokens}
                onSelect={(token) => handleTokenSelect("sell", token)}
                onClose={() => setShowSellTokens(false)}
                searchPlaceholder="Search sell token..."
              />
            </div>
          </div>
          {sellToken && buyToken && sellAmount && (
            <div className="text-gray-400 mt-2 text-sm flex justify-between">
              <span>
                ≈ ${(parseFloat(sellAmount) * (currentPrice || 0)).toFixed(2)}
              </span>
              <span>
                1 {sellToken.symbol} = {currentPrice.toFixed(6)}{" "}
                {buyToken.symbol}
              </span>
            </div>
          )}
        </div>
        {/* Direction toggle button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={toggleDirection}
            className="bg-gray-900 hover:bg-gray-700 p-2.5 rounded-full border border-gray-700 shadow-lg transition-colors duration-200"
            disabled={isSwapping}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-pink-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* Buy token section */}
        <div className="p-5 bg-gray-800 mx-2 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <div className="text-gray-300 text-base font-medium">Buy</div>
            {buyToken && account && (
              <div className="text-gray-400 text-sm font-medium px-2.5 py-0.5 bg-gray-700 rounded-full">
                Balance: 0.00
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={buyAmount}
              onChange={handleBuyAmountChange}
              placeholder="0"
              className="bg-transparent text-white text-4xl font-light focus:outline-none w-3/5"
              disabled={isSwapping}
            />
            <div className="relative">
              <button
                ref={buyTokenBtnRef}
                onClick={() => {
                  setShowBuyTokens(!showBuyTokens);
                  setShowSellTokens(false); // Close the other dropdown
                }}
                className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 rounded-xl pl-3 pr-2 py-2 text-white transition-colors duration-200"
                disabled={isSwapping}
              >
                {buyToken ? (
                  <>
                    <img
                      src={buyToken.icon}
                      alt={buyToken.symbol}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span className="font-medium">{buyToken.symbol}</span>
                  </>
                ) : (
                  <span>Select token</span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <TokenDropdown
                isOpen={showBuyTokens}
                tokens={availableTokens}
                onSelect={(token) => handleTokenSelect("buy", token)}
                onClose={() => setShowBuyTokens(false)}
                searchPlaceholder="Search buy token..."
              />
            </div>
          </div>
          {sellToken && buyToken && buyAmount && (
            <div className="text-gray-400 mt-2 text-sm">
              ≈ ${(parseFloat(buyAmount) / (currentPrice || 1)).toFixed(2)}
            </div>
          )}
        </div>
        {/* Transaction info */}
        {sellToken && buyToken && sellAmount && buyAmount && (
          <div className="p-4 mt-3 mx-2 mb-3 bg-gray-900 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-300 mb-2">
              <span>Rate</span>
              <span className="font-medium">
                1 {sellToken.symbol} = {currentPrice.toFixed(6)}{" "}
                {buyToken.symbol}
              </span>
            </div>
            {priceImpact > 0 && (
              <div className="flex justify-between items-center text-sm text-gray-300 mb-2">
                <span>Price Impact</span>
                <span
                  className={`font-medium ${
                    priceImpact > 5 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm text-gray-300 mb-2">
              <span>Slippage Tolerance</span>
              <span className="font-medium text-pink-500">{slippage}%</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-300">
              <span>Transaction Deadline</span>
              <span className="font-medium text-pink-500">
                {deadlineMinutes} minutes
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-700">
              <span>Last Updated</span>
              <span>{lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>
        )}{" "}
        {/* Nút Swap */}
        <div className="p-4 bg-gray-900">
          {error && (
            <div className="mb-2 p-2 bg-red-900/50 border border-red-600 rounded-lg text-red-200 text-sm">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleSwap}
            disabled={
              !sellToken ||
              !buyToken ||
              !sellAmount ||
              !buyAmount ||
              isSwapping ||
              !isConnected
            }
            className={`w-full py-4 rounded-xl font-medium text-lg transition-all duration-300 ${
              !sellToken ||
              !buyToken ||
              !sellAmount ||
              !buyAmount ||
              isSwapping ||
              !isConnected
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/20"
            }`}
          >
            {isSwapping ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Swapping...
              </div>
            ) : !isConnected ? (
              <div className="flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                    clipRule="evenodd"
                  />
                </svg>
                Connect Wallet
              </div>
            ) : !sellToken || !buyToken ? (
              "Select Tokens"
            ) : !sellAmount || !buyAmount ? (
              "Enter Amount"
            ) : (
              `Swap ${sellToken.symbol} for ${buyToken.symbol}`
            )}
          </button>

          {/* Network Fee and info */}
          {sellToken && buyToken && sellAmount && buyAmount && (
            <div className="mt-3 text-center text-xs text-gray-400">
              Network fee estimated at 0.0003 ETH (~$0.85)
            </div>
          )}
        </div>
      </div>

      {/* Safety Reminder */}
      <div className="mt-4 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-gray-300">
        <div className="flex items-start">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 102 0v-5a1 1 0 10-2 0v5z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p>Check the information before swap.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SwapToken;
