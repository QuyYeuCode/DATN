import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Copy,
  Settings,
  BellRing,
  Minus,
  Plus,
} from "lucide-react";
import { useWallet } from "../contexts/WalletContext";
import { ethers } from "ethers";
import DexABI from "../abis/Dex.json";

// Định nghĩa các interface
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  tick: number;
  sqrtPriceX96: string;
  liquidity: string;
  token0Price: number;
  token1Price: number;
}

const DEX_CONTRACT_ADDRESS = "0x87354828f54dBf1C9859F878909Ec88FAB420E5A";
const FEE_TIERS = [
  { fee: 100, label: "0.01%", description: "Best for stable pairs" },
  { fee: 500, label: "0.05%", description: "Best for stable pairs" },
  { fee: 3000, label: "0.3%", description: "Best for most pairs" },
  { fee: 10000, label: "1%", description: "Best for exotic pairs" },
];

export default function AddLiquidity() {
  const { account, isConnected, provider, signer } = useWallet();

  // State cho token selection
  const [token0, setToken0] = useState<TokenInfo | null>(null);
  const [token1, setToken1] = useState<TokenInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [showToken0List, setShowToken0List] = useState(false);
  const [showToken1List, setShowToken1List] = useState(false);

  // State cho fee tier
  const [selectedFee, setSelectedFee] = useState(3000); // Default 0.3%

  // State cho deposit amount
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [balance0, setBalance0] = useState("0");
  const [balance1, setBalance1] = useState("0");

  // State cho price range
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("0");
  const [currentPrice, setCurrentPrice] = useState("0");

  // State cho pool info
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);

  // State cho loading và error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch danh sách token
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch("/api/tokens");
        const data = await response.json();
        if (data.success) {
          setAvailableTokens(data.data);
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setError("Không thể lấy danh sách token");
      }
    };

    fetchTokens();
  }, []);

  // Fetch thông tin pool khi token0, token1 và fee thay đổi
  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!token0 || !token1 || !selectedFee) return;

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/pool-info?token0=${token0.address}&token1=${token1.address}&fee=${selectedFee}`
        );
        const data = await response.json();

        if (data.success) {
          setPoolInfo(data.data);
          setCurrentPrice(data.data.token1Price / data.data.token0Price);

          // Set default price range (±5% of current price)
          const price = data.data.token1Price / data.data.token0Price;
          setMinPrice((price * 0.95).toFixed(6));
          setMaxPrice((price * 1.05).toFixed(6));
        }
      } catch (error) {
        console.error("Error fetching pool info:", error);
        setError("Không thể lấy thông tin pool");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoolInfo();
  }, [token0, token1, selectedFee]);

  // Fetch balance khi account và token thay đổi
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !account || !provider) return;

      try {
        if (token0) {
          const tokenContract0 = new ethers.Contract(
            token0.address,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          const balance = await tokenContract0.balanceOf(account);
          setBalance0(ethers.formatUnits(balance, token0.decimals));
        }

        if (token1) {
          const tokenContract1 = new ethers.Contract(
            token1.address,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          const balance = await tokenContract1.balanceOf(account);
          setBalance1(ethers.formatUnits(balance, token1.decimals));
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
      }
    };

    fetchBalances();
  }, [account, token0, token1, provider, isConnected]);

  // Tính toán giá trị thanh khoản
  const calculateLiquidity = async () => {
    if (!token0 || !token1 || !amount0 || !amount1 || !minPrice || !maxPrice) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setIsLoading(true);

      // Chuyển đổi giá thành tick
      const minPriceX96 = ethers.parseUnits(minPrice, 96);
      const maxPriceX96 = ethers.parseUnits(maxPrice, 96);

      // Tính toán tickLower và tickUpper (giả lập đơn giản)
      const tickLower = -887272; // Giá trị mẫu, trong thực tế cần tính toán chính xác
      const tickUpper = 887272; // Giá trị mẫu, trong thực tế cần tính toán chính xác

      const response = await fetch("/api/calculate-liquidity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token0: token0.address,
          token1: token1.address,
          fee: selectedFee,
          amount0Desired: ethers
            .parseUnits(amount0, token0.decimals)
            .toString(),
          amount1Desired: ethers
            .parseUnits(amount1, token1.decimals)
            .toString(),
          tickLower,
          tickUpper,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (error) {
      console.error("Error calculating liquidity:", error);
      setError("Không thể tính toán giá trị thanh khoản");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm thanh khoản
  const addLiquidity = async () => {
    if (!isConnected || !signer) {
      setError("Vui lòng kết nối ví");
      return;
    }

    if (!token0 || !token1 || !amount0 || !amount1 || !minPrice || !maxPrice) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setIsLoading(true);

      // Tính toán giá trị thanh khoản
      const liquidityData = await calculateLiquidity();
      if (!liquidityData) return;

      // Chuyển đổi giá thành tick
      const tickLower = -887272; // Giá trị mẫu, trong thực tế cần tính toán chính xác
      const tickUpper = 887272; // Giá trị mẫu, trong thực tế cần tính toán chính xác

      // Approve token0
      const token0Contract = new ethers.Contract(
        token0.address,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
        ],
        signer
      );

      await token0Contract.approve(
        DEX_CONTRACT_ADDRESS,
        ethers.parseUnits(amount0, token0.decimals)
      );

      // Approve token1
      const token1Contract = new ethers.Contract(
        token1.address,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
        ],
        signer
      );

      await token1Contract.approve(
        DEX_CONTRACT_ADDRESS,
        ethers.parseUnits(amount1, token1.decimals)
      );

      // Gọi hàm addLiquidity trên smart contract
      const dexContract = new ethers.Contract(
        DEX_CONTRACT_ADDRESS,
        DexABI,
        signer
      );

      const tx = await dexContract.addLiquidity(
        token0.address,
        token1.address,
        ethers.parseUnits(amount0, token0.decimals),
        ethers.parseUnits(amount1, token1.decimals),
        0, // amount0Min (0 for simplicity, should calculate slippage in production)
        0, // amount1Min (0 for simplicity, should calculate slippage in production)
        selectedFee,
        tickLower,
        tickUpper
      );

      // Lưu thông tin giao dịch vào backend
      const receipt = await tx.wait();

      // Lấy tokenId từ event (giả sử event có tên là LiquidityAdded)
      const event = receipt.logs
        .filter(
          (log) =>
            log.topics[0] ===
            ethers.id(
              "LiquidityAdded(address,uint256,address,address,uint128,uint256,uint256)"
            )
        )
        .map((log) => dexContract.interface.parseLog(log))[0];

      const tokenId = event.args.tokenId;
      const liquidityAmount = event.args.liquidity;
      const amount0Used = event.args.amount0;
      const amount1Used = event.args.amount1;

      // Lưu thông tin vào backend
      await fetch("/api/add-liquidity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: account,
          tokenId: tokenId.toString(),
          token0: token0.address,
          token1: token1.address,
          fee: selectedFee,
          tickLower,
          tickUpper,
          liquidity: liquidityAmount.toString(),
          amount0: amount0Used.toString(),
          amount1: amount1Used.toString(),
          txHash: receipt.hash,
          status: "COMPLETED",
        }),
      });

      // Reset form
      setAmount0("");
      setAmount1("");
      setError("");

      // Hiển thị thông báo thành công
      alert("Thêm thanh khoản thành công!");
    } catch (error) {
      console.error("Error adding liquidity:", error);
      setError("Không thể thêm thanh khoản: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý chọn token
  const handleSelectToken0 = (token: TokenInfo) => {
    setToken0(token);
    setShowToken0List(false);
  };

  const handleSelectToken1 = (token: TokenInfo) => {
    setToken1(token);
    setShowToken1List(false);
  };

  // Xử lý thay đổi giá trị
  const handleAmount0Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setAmount0(value);
    // Tính toán amount1 dựa trên tỷ giá nếu có
    if (currentPrice && value) {
      setAmount1((parseFloat(value) * parseFloat(currentPrice)).toFixed(6));
    }
  };

  const handleAmount1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setAmount1(value);
    // Tính toán amount0 dựa trên tỷ giá nếu có
    if (currentPrice && value) {
      setAmount0((parseFloat(value) / parseFloat(currentPrice)).toFixed(6));
    }
  };

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
              <span className="text-white font-medium">
                {poolInfo ? "5,084.31%" : "--"}
              </span>
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
              <div
                className="bg-slate-800 rounded-lg flex-1 cursor-pointer"
                onClick={() => setShowToken0List(!showToken0List)}
              >
                <div className="flex items-center p-2">
                  {token0 ? (
                    <>
                      <img
                        src={token0.icon}
                        alt={token0.symbol}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span className="text-white">{token0.symbol}</span>
                    </>
                  ) : (
                    <span className="text-white">Select token</span>
                  )}
                  <ChevronDown size={20} className="ml-auto text-gray-400" />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-gray-700 rounded-full p-1">
                  <Plus size={14} className="text-gray-400" />
                </div>
              </div>
              <div
                className="bg-slate-800 rounded-lg flex-1 cursor-pointer"
                onClick={() => setShowToken1List(!showToken1List)}
              >
                <div className="flex items-center p-2">
                  {token1 ? (
                    <>
                      <img
                        src={token1.icon}
                        alt={token1.symbol}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span className="text-white">{token1.symbol}</span>
                    </>
                  ) : (
                    <span className="text-white">Select token</span>
                  )}
                  <ChevronDown size={20} className="ml-auto text-gray-400" />
                </div>
              </div>
            </div>

            {/* Token0 List */}
            {showToken0List && (
              <div className="mt-2 bg-slate-800 rounded-lg p-2 max-h-60 overflow-y-auto">
                {availableTokens.map((token) => (
                  <div
                    key={token.address}
                    className="flex items-center p-2 hover:bg-slate-700 cursor-pointer rounded-lg"
                    onClick={() => handleSelectToken0(token)}
                  >
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <div>
                      <div className="text-white">{token.symbol}</div>
                      <div className="text-gray-400 text-xs">{token.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Token1 List */}
            {showToken1List && (
              <div className="mt-2 bg-slate-800 rounded-lg p-2 max-h-60 overflow-y-auto">
                {availableTokens.map((token) => (
                  <div
                    key={token.address}
                    className="flex items-center p-2 hover:bg-slate-700 cursor-pointer rounded-lg"
                    onClick={() => handleSelectToken1(token)}
                  >
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <div>
                      <div className="text-white">{token.symbol}</div>
                      <div className="text-gray-400 text-xs">{token.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fee Tier */}
          <div className="bg-slate-800 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-white">
                  V3 LP - {FEE_TIERS.find((f) => f.fee === selectedFee)?.label}{" "}
                  fee tier
                </span>
                <div className="ml-2 bg-slate-900 rounded-full px-2 py-0.5 text-xs text-purple-400">
                  2% Pick
                </div>
              </div>
              <div className="relative">
                <button className="text-teal-400 flex items-center">
                  More <ChevronDown size={16} />
                </button>
                {/* Fee tier selection dropdown could be added here */}
              </div>
            </div>
          </div>

          {/* Deposit Amount */}
          <div className="mb-2">
            <p className="text-purple-400 text-sm mb-2">DEPOSIT AMOUNT</p>
            <div className="bg-slate-800 rounded-lg p-3 mb-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {token0 ? (
                    <>
                      <img
                        src={token0.icon}
                        alt={token0.symbol}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span className="text-white">{token0.symbol}</span>
                    </>
                  ) : (
                    <div className="bg-gray-700 w-6 h-6 rounded-full mr-2"></div>
                  )}
                </div>
                <span className="text-gray-400 text-sm">
                  Balance: {balance0}
                </span>
              </div>
              <input
                type="text"
                className="bg-transparent w-full text-white text-xl focus:outline-none"
                placeholder="0.0"
                value={amount0}
                onChange={handleAmount0Change}
              />
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  {token1 ? (
                    <>
                      <img
                        src={token1.icon}
                        alt={token1.symbol}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span className="text-white">{token1.symbol}</span>
                    </>
                  ) : (
                    <div className="bg-gray-700 w-6 h-6 rounded-full mr-2"></div>
                  )}
                </div>
                <span className="text-gray-400 text-sm">
                  Balance: {balance1}
                </span>
              </div>
              <input
                type="text"
                className="bg-transparent w-full text-white text-xl focus:outline-none"
                placeholder="0.0"
                value={amount1}
                onChange={handleAmount1Change}
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
                  <span>{token0 ? token0.symbol : "Token0"}</span>
                </div>
              </div>
            </div>

            <div className="mb-2 text-sm text-gray-400">
              Current Price: {currentPrice} {token1 ? token1.symbol : "Token1"}{" "}
              per {token0 ? token0.symbol : "Token0"}
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
                    <button
                      className="text-teal-400"
                      onClick={() =>
                        setMinPrice((parseFloat(minPrice) * 0.99).toFixed(6))
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="text"
                      className="bg-transparent text-center text-white text-xl focus:outline-none w-24"
                      value={minPrice}
                      onChange={(e) =>
                        setMinPrice(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                    />
                    <button
                      className="text-teal-400"
                      onClick={() =>
                        setMinPrice((parseFloat(minPrice) * 1.01).toFixed(6))
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-1">
                    {token1 ? token1.symbol : "Token1"} per{" "}
                    {token0 ? token0.symbol : "Token0"}
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-black rounded-3xl">
                <div className="text-center mb-2 text-white">Max Price</div>
                <div className="p-4 bg-black rounded-3xl">
                  <div className="flex justify-between items-center">
                    <button
                      className="text-teal-400"
                      onClick={() =>
                        setMaxPrice((parseFloat(maxPrice) * 0.99).toFixed(6))
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="text"
                      className="bg-transparent text-center text-white text-xl focus:outline-none w-24"
                      value={maxPrice}
                      onChange={(e) =>
                        setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                    />
                    <button
                      className="text-teal-400"
                      onClick={() =>
                        setMaxPrice((parseFloat(maxPrice) * 1.01).toFixed(6))
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400 mt-1">
                    {token1 ? token1.symbol : "Token1"} per{" "}
                    {token0 ? token0.symbol : "Token0"}
                  </div>
                </div>
              </div>
            </div>

            {/* Range buttons */}
            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              <button
                className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm"
                onClick={() => {
                  if (currentPrice) {
                    const price = parseFloat(currentPrice);
                    setMinPrice((price * 0.999).toFixed(6));
                    setMaxPrice((price * 1.001).toFixed(6));
                  }
                }}
              >
                0.1%
              </button>
              <button
                className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm"
                onClick={() => {
                  if (currentPrice) {
                    const price = parseFloat(currentPrice);
                    setMinPrice((price * 0.995).toFixed(6));
                    setMaxPrice((price * 1.005).toFixed(6));
                  }
                }}
              >
                0.5%
              </button>
              <button
                className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm"
                onClick={() => {
                  if (currentPrice) {
                    const price = parseFloat(currentPrice);
                    setMinPrice((price * 0.99).toFixed(6));
                    setMaxPrice((price * 1.01).toFixed(6));
                  }
                }}
              >
                1%
              </button>
              <button
                className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm"
                onClick={() => {
                  if (currentPrice) {
                    const price = parseFloat(currentPrice);
                    setMinPrice((price * 0.975).toFixed(6));
                    setMaxPrice((price * 1.025).toFixed(6));
                  }
                }}
              >
                2.5%
              </button>
              <button
                className="border border-teal-400 text-teal-400 rounded-full px-4 py-1 text-sm"
                onClick={() => {
                  if (currentPrice) {
                    const price = parseFloat(currentPrice);
                    setMinPrice((price * 0.95).toFixed(6));
                    setMaxPrice((price * 1.05).toFixed(6));
                  }
                }}
              >
                5%
              </button>
            </div>
          </div>
        </div>

        {/* Add Liquidity Button */}
        <div className="p-4">
          {error && (
            <div className="bg-red-900 text-red-200 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <button
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white py-3 rounded-xl font-medium text-lg hover:from-purple-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={addLiquidity}
            disabled={
              isLoading ||
              !isConnected ||
              !token0 ||
              !token1 ||
              !amount0 ||
              !amount1 ||
              !minPrice ||
              !maxPrice
            }
          >
            {isLoading ? "Đang xử lý..." : "Add Liquidity"}
          </button>
        </div>
      </div>
    </div>
  );
}
