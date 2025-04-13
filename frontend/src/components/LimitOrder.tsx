import React, { useState } from "react";
import { ChevronDown, ArrowDown, Eye } from "lucide-react";

const LimitOrder = () => {
  const [activeTab, setActiveTab] = useState("openOrders");
  const [activeTradeType, setActiveTradeType] = useState("Limit");
  const [fromToken, setFromToken] = useState({ symbol: "BNB", amount: "0.0" });
  const [toToken, setToToken] = useState({ symbol: "CAKE", amount: "0.0" });
  const [rate, setRate] = useState("310.130");

  return (
    <div className="min-h-screen bg-indigo-900 p-4 mt-20 flex flex-col items-center">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6">
        {/* Left panel - Orders */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Tab navigation */}
          <div className="flex rounded-t-lg overflow-hidden">
            <button
              className={`py-3 px-6 font-medium ${
                activeTab === "openOrders"
                  ? "bg-purple-300 text-gray-900"
                  : "bg-gray-800 text-gray-300"
              }`}
              onClick={() => setActiveTab("openOrders")}
            >
              Open Orders (0)
            </button>
            <button
              className={`py-3 px-6 font-medium ${
                activeTab === "orderHistory"
                  ? "bg-purple-300 text-gray-900"
                  : "bg-gray-800 text-gray-300"
              }`}
              onClick={() => setActiveTab("orderHistory")}
            >
              Order History
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4 flex items-center justify-center h-64 text-gray-400">
            No open orders
          </div>
        </div>

        {/* Right panel - Trading interface */}
        <div className="space-y-4">
          {/* Trade type selection */}
          <div className="bg-gray-900 rounded-full p-1 flex justify-between">
            <button
              className={`py-2 px-6 rounded-full ${
                activeTradeType === "Swap"
                  ? "bg-purple-500 text-white"
                  : "text-gray-300"
              }`}
              onClick={() => setActiveTradeType("Swap")}
            >
              Swap
            </button>
            <button
              className={`py-2 px-6 rounded-full ${
                activeTradeType === "TWAP"
                  ? "bg-purple-500 text-white"
                  : "text-gray-300"
              }`}
              onClick={() => setActiveTradeType("TWAP")}
            >
              TWAP
            </button>
            <button
              className={`py-2 px-6 rounded-full ${
                activeTradeType === "Limit"
                  ? "bg-purple-300 text-gray-900"
                  : "text-gray-300"
              }`}
              onClick={() => setActiveTradeType("Limit")}
            >
              Limit
            </button>
          </div>

          {/* Trading card */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-4">
            {/* From token */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">From</span>
                <button className="text-white p-1">
                  <Eye size={16} />
                </button>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 flex items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-500 rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <span className="text-white">₿</span>
                  </div>
                  <span className="text-white font-bold">BNB</span>
                  <ChevronDown className="text-white" size={16} />
                </div>
                <input
                  type="text"
                  value={fromToken.amount}
                  onChange={(e) =>
                    setFromToken({ ...fromToken, amount: e.target.value })
                  }
                  className="ml-auto bg-transparent text-white text-right text-xl font-bold w-1/2 outline-none"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex justify-center">
              <div className="bg-gray-800 p-2 rounded-full text-cyan-400">
                <ArrowDown size={20} />
              </div>
            </div>

            {/* To token */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">To</span>
                <button className="text-white p-1">
                  <Eye size={16} />
                </button>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 flex items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-cyan-400 rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <span className="text-orange-500">🐰</span>
                  </div>
                  <span className="text-white font-bold">CAKE</span>
                  <ChevronDown className="text-white" size={16} />
                </div>
                <input
                  type="text"
                  value={toToken.amount}
                  onChange={(e) =>
                    setToToken({ ...toToken, amount: e.target.value })
                  }
                  className="ml-auto bg-transparent text-white text-right text-xl font-bold w-1/2 outline-none"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Rate information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-sm mb-1">
                  Sell BNB at rate
                </div>
                <div className="bg-gray-800 rounded-xl p-3 flex items-center">
                  <span className="text-gray-300">CAKE</span>
                  <div className="ml-auto">
                    <div className="text-white font-bold">{rate}</div>
                    <div className="text-gray-500 text-sm">≈$76.84 USD</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400 text-sm invisible">
                    Placeholder
                  </span>
                  <button className="text-cyan-400 text-sm">
                    Set market rate
                  </button>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 flex items-center">
                  <span className="text-gray-300">Gain</span>
                  <span className="ml-auto text-white font-bold">0.0%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button className="w-full bg-gray-700 text-gray-400 py-4 rounded-xl font-medium">
            Enter an amount
          </button>

          {/* Footer */}
          <div className="flex justify-center items-center mt-4 text-gray-400">
            <span>Powered by Orbs</span>
            <div className="ml-2 bg-blue-600 rounded-full w-5 h-5"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitOrder;
