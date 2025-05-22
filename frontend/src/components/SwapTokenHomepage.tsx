import React, { useState } from "react";

type TokenInfo = {
  symbol: string;
  icon: string;
};

interface SwapTokenProps {
  onSwap?: (
    sellAmount: string,
    buyAmount: string,
    sellToken: string,
    buyToken: string
  ) => void;
}

const SwapTokenHomepage: React.FC<SwapTokenProps> = ({ onSwap }) => {
  const [sellAmount, setSellAmount] = useState<string>("");
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [sellToken, setSellToken] = useState<TokenInfo>({
    symbol: "ETH",
    icon: "https://www.iconarchive.com/show/cryptocurrency-flat-icons-by-cjdowner/Ethereum-ETH-icon.html",
  });
  const [buyToken, setBuyToken] = useState<TokenInfo | null>(null);
  const [showSellTokens, setShowSellTokens] = useState<boolean>(false);
  const [showBuyTokens, setShowBuyTokens] = useState<boolean>(false);

  // Mock data cho danh sách token
  const availableTokens: TokenInfo[] = [
    {
      symbol: "ETH",
      icon: "https://www.iconarchive.com/show/cryptocurrency-flat-icons-by-cjdowner/Ethereum-ETH-icon.html",
    },
    {
      symbol: "BTC",
      icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    },
    {
      symbol: "USDT",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    },
    { symbol: "BNB", icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png" },
  ];

  const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ cho phép nhập số và dấu chấm
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setSellAmount(value);

    // Trong thực tế, sẽ cần tính toán tỷ giá và cập nhật buyAmount
    // Đây chỉ là giả lập đơn giản
    setBuyAmount(value);
  };

  const handleBuyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setBuyAmount(value);
    setSellAmount(value); // Giả lập tỷ giá 1:1
  };

  const handleTokenSelect = (type: "sell" | "buy", token: TokenInfo) => {
    if (type === "sell") {
      setSellToken(token);
      setShowSellTokens(false);
    } else {
      setBuyToken(token);
      setShowBuyTokens(false);
    }
  };

  const toggleDirection = () => {
    // Hoán đổi token bán và mua
    const tempToken = sellToken;
    setSellToken(buyToken || tempToken);
    setBuyToken(tempToken);

    // Hoán đổi số lượng
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  const handleSwap = () => {
    if (onSwap && sellAmount && buyAmount && sellToken && buyToken) {
      onSwap(sellAmount, buyAmount, sellToken.symbol, buyToken.symbol);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-3">
      <div className="bg-gray-600 rounded-2xl overflow-hidden shadow-xl">
        {/* Phần bán token */}
        <div className="p-5 bg-black bg-opacity-30 border-b border-gray-800 rounded-2xl mx-2 mt-2">
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-300 text-lg font-medium">Sell</div>
          </div>
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={sellAmount}
              onChange={handleSellAmountChange}
              placeholder="0"
              className="bg-transparent text-white text-5xl font-light focus:outline-none w-3/5"
            />
            <div className="relative">
              <button
                onClick={() => setShowSellTokens(!showSellTokens)}
                className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 rounded-full pl-3 pr-2 py-2 text-white transition-colors duration-200"
              >
                {sellToken && (
                  <img
                    src={sellToken.icon}
                    alt={sellToken.symbol}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span>{sellToken?.symbol || "Select token"}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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

              {showSellTokens && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-lg z-10">
                  <div className="py-2">
                    {availableTokens.map((token) => (
                      <div
                        key={token.symbol}
                        className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleTokenSelect("sell", token)}
                      >
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="text-white">{token.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-500 mt-1">$0</div>
        </div>

        {/* Nút chuyển đổi hướng */}
        <div className="flex justify-center -my-4 relative z-10">
          <button
            onClick={toggleDirection}
            className="bg-gray-800 hover:bg-gray-700 p-3 rounded-md transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400"
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

        {/* Phần mua token */}
        <div className="p-6 bg-black bg-opacity-20  rounded-2xl mx-2">
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-300 text-lg font-medium">Buy</div>
          </div>
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={buyAmount}
              onChange={handleBuyAmountChange}
              placeholder="0"
              className="bg-transparent text-white text-5xl font-light focus:outline-none w-3/5"
            />
            <div className="relative">
              <button
                onClick={() => setShowBuyTokens(!showBuyTokens)}
                className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 rounded-full pl-3 pr-2 py-2 text-white transition-colors duration-200"
              >
                {buyToken ? (
                  <>
                    <img
                      src={buyToken.icon}
                      alt={buyToken.symbol}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{buyToken.symbol}</span>
                  </>
                ) : (
                  <span>Select token</span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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

              {showBuyTokens && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-lg z-10">
                  <div className="py-2">
                    {availableTokens.map((token) => (
                      <div
                        key={token.symbol}
                        className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleTokenSelect("buy", token)}
                      >
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <span className="text-white">{token.symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-500 mt-1">$0</div>
        </div>

        {/* Nút Swap */}
        <div className="p-6 pt-2 ">
          <button
            onClick={handleSwap}
            disabled={!sellAmount || !buyAmount || !buyToken}
            className={`w-full py-4 rounded-xl text-white text-lg font-medium transition-colors duration-200 cursor-pointer ${
              !sellAmount || !buyAmount || !buyToken
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            }`}
          >
            {!buyToken ? "Select token" : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapTokenHomepage;
