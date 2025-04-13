import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Copy,
  Settings,
  BellRing,
  Minus,
  Plus,
} from "lucide-react";

export default function PancakeSwapLiquidity() {
  const [minPrice, setMinPrice] = useState("578.35");
  const [maxPrice, setMaxPrice] = useState("579.39");

  return (
    <div className="flex justify-center mt-19 items-center min-h-screen bg-slate-800">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center">
          <button className="mr-2 text-gray-400 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-white text-xl font-medium">Add V3 Liquidity</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="bg-slate-800 px-3 py-1 rounded-lg text-xs flex items-center">
              <span className="text-purple-400 mr-1">APR (with farming)</span>
              <span className="text-white font-medium">5,084.31%</span>
            </div>
            <button className="text-gray-400 hover:text-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Token Selection */}
        <div className="p-4">
          <div className="mb-2">
            <p className="text-purple-400 text-sm mb-2">CHOOSE TOKEN PAIR</p>
            <div className="flex gap-2">
              <div className="bg-slate-800 rounded-lg flex-1">
                <div className="flex items-center p-2">
                  <div className="bg-yellow-500 rounded-full w-6 h-6 mr-2"></div>
                  <span className="text-white">BNB</span>
                  <ChevronDown size={20} className="ml-auto text-gray-400" />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-gray-700 rounded-full p-1">
                  <Plus size={14} className="text-gray-400" />
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg flex-1">
                <div className="flex items-center p-2">
                  <div className="bg-teal-500 rounded-full w-6 h-6 mr-2"></div>
                  <span className="text-white">USDT</span>
                  <ChevronDown size={20} className="ml-auto text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Fee Tier */}
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-white">V3 LP - 0.01% fee tier</span>
                <div className="ml-2 bg-slate-900 rounded-full px-2 py-0.5 text-xs text-purple-400">
                  2% Pick
                </div>
              </div>
              <button className="text-teal-400 flex items-center">
                More <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Deposit Amount */}
          <div className="mb-2">
            <p className="text-purple-400 text-sm mb-2">DEPOSIT AMOUNT</p>
            <div className="bg-slate-800 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="bg-yellow-500 rounded-full w-6 h-6 mr-2"></div>
                  <span className="text-white">BNB</span>
                </div>
                <span className="text-gray-400 text-sm">Balance: 0</span>
              </div>
              <input
                type="text"
                className="bg-transparent w-full text-white text-xl focus:outline-none"
                placeholder="0.0"
              />
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="bg-teal-500 rounded-full w-6 h-6 mr-2"></div>
                  <span className="text-white">USDT</span>
                  <Copy size={14} className="ml-2 text-gray-400" />
                </div>
                <span className="text-gray-400 text-sm">Balance: 0</span>
              </div>
              <input
                type="text"
                className="bg-transparent w-full text-white text-xl focus:outline-none"
                placeholder="0.0"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-purple-400 text-sm">SET PRICE RANGE</p>
              <div className="flex items-center">
                <span className="text-gray-400 text-sm mr-1">
                  View prices in
                </span>
                <div className="bg-teal-900 text-teal-400 rounded px-2 py-0.5 text-sm flex items-center">
                  <span>BNB</span>
                </div>
              </div>
            </div>

            <div className="mb-2 text-sm text-gray-400">
              Current Price: 578.625 USDT per BNB
            </div>

            {/* Chart placeholder */}
            <div className="h-32 bg-gradient-to-r from-purple-900 via-teal-900 to-teal-800 rounded-lg mb-4 relative">
              <div className="absolute h-full w-px bg-blue-400 left-1/2 opacity-50"></div>
              <div className="absolute h-full w-2 bg-purple-500 left-1/4 opacity-75 rounded"></div>
              <div className="absolute h-full w-2 bg-purple-500 right-1/4 opacity-75 rounded"></div>
            </div>

            {/* Price inputs */}
            <div className="flex mx-10 gap-30 mb-4">
              <div className="flex-1 bg-black rounded-3xl">
                <div className="text-center mb-2 text-white">Min Price</div>
                <div className="bg-black p-4 rounded-3xl">
                  <div className="flex justify-between items-center">
                    <button className="text-teal-400">
                      <Minus size={16} />
                    </button>
                    <input
                      type="text"
                      className="bg-transparent text-center text-white text-xl focus:outline-none w-24"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <button className="text-teal-400">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-1">
                    USDT per BNB
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-black rounded-3xl">
                <div className="text-center mb-2  text-white">Max Price</div>
                <div className="p-4 bg-black rounded-3xl">
                  <div className="flex justify-between items-center">
                    <button className="text-teal-400">
                      <Minus size={16} />
                    </button>
                    <input
                      type="text"
                      className="bg-transparent text-center text-white text-xl focus:outline-none w-24"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                    <button className="text-teal-400">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-1">
                    USDT per BNB
                  </div>
                </div>
              </div>
            </div>

            {/* Range buttons */}
            <div className="flex gap-2 mb-4">
              <button className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm">
                0.1%
              </button>
              <button className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm">
                0.5%
              </button>
              <button className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm">
                1%
              </button>
              <button className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm">
                Full Range
              </button>
            </div>

            {/* Input Amount */}
            <button className="w-full bg-gray-700 text-gray-400 p-3 rounded-lg">
              Enter an amount
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
