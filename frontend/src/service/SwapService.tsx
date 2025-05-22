import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import DexABI from "../abis/Dex.json";

const DEX_CONTRACT_ADDRESS = "0x87354828f54dBf1C9859F878909Ec88FAB420E5A";
const DEFAULT_SLIPPAGE = 0.5; // 0.5%
const DEFAULT_DEADLINE_MINUTES = 20;
const PRICE_UPDATE_INTERVAL = 5000; // Cập nhật giá mỗi 5 giây

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn?: string;
  amountOut?: string;
  slippage: number;
  deadlineMinutes: number;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  price: number;
  priceImpact: number;
  route: string[];
}

export const getTokenList = async (): Promise<TokenInfo[]> => {
  return [
    {
      address: "0x...",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    },
    {
      address: "0x...",
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 8,
      icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    },
    {
      address: "0x...",
      symbol: "USDT",
      name: "Tether Coin",
      decimals: 18,
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    },
    {
      address: "0x...",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 18,
      icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    },
  ];
};

// Cập nhật hàm getTokenPrice để sử dụng API mới
export const getTokenPrice = async (
  tokenIn: string,
  tokenOut: string
): Promise<number> => {
  try {
    const response = await fetch(
      `/api/price?tokenIn=${tokenIn}&tokenOut=${tokenOut}`
    );
    const data = await response.json();
    return data.success ? data.data.price : 0;
  } catch (error) {
    console.error("Lỗi khi lấy giá token:", error);
    return 0;
  }
};

// Cập nhật hàm calculateAmountOut để sử dụng API mới
export const calculateAmountOut = async (
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<string> => {
  try {
    if (!amountIn || parseFloat(amountIn) === 0) return "0";

    const response = await fetch(
      `/api/calculate-amount-out?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${amountIn}`
    );
    const data = await response.json();
    return data.success ? data.data.amountOut : "0";
  } catch (error) {
    console.error("Lỗi khi tính toán số lượng token đầu ra:", error);
    return "0";
  }
};

// Cập nhật hàm getSwapQuote để sử dụng API mới
export const getSwapQuote = async (params: SwapParams): Promise<SwapQuote> => {
  try {
    const { tokenIn, tokenOut, amountIn, amountOut } = params;
    const queryParams = new URLSearchParams();
    queryParams.append("tokenIn", tokenIn);
    queryParams.append("tokenOut", tokenOut);
    if (amountIn) queryParams.append("amountIn", amountIn);
    if (amountOut) queryParams.append("amountOut", amountOut);

    const response = await fetch(`/api/swap-quote?${queryParams.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Lỗi khi lấy báo giá swap");
    }

    return data.data;
  } catch (error) {
    console.error("Lỗi khi lấy báo giá swap:", error);
    throw error;
  }
};

// Cập nhật hàm executeSwap để lưu thông tin giao dịch vào backend
export const executeSwap = async (params: SwapParams): Promise<string> => {
  const { provider, signer, account } = useWallet();

  if (!provider || !signer || !account) {
    throw new Error("Wallet not connected");
  }

  try {
    const dexContract = new ethers.Contract(
      DEX_CONTRACT_ADDRESS,
      DexABI,
      signer
    );

    const tokenInContract = new ethers.Contract(
      params.tokenIn,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
      ],
      signer
    );

    // Lấy báo giá swap mới nhất
    const quote = await getSwapQuote(params);

    // Tính toán amountOutMinimum dựa trên slippage
    const amountIn = ethers.parseUnits(quote.amountIn, 18);
    const amountOutMinimum = ethers.parseUnits(
      (parseFloat(quote.amountOut) * (1 - params.slippage / 100)).toString(),
      18
    );

    // Tính toán deadline
    const deadline =
      Math.floor(Date.now() / 1000) + params.deadlineMinutes * 60;

    // Approve token
    const approveTx = await tokenInContract.approve(
      DEX_CONTRACT_ADDRESS,
      amountIn
    );
    await approveTx.wait();

    // Thực hiện swap
    const swapTx = await dexContract.swap(
      params.tokenIn,
      params.tokenOut,
      amountIn,
      amountOutMinimum,
      3000, // poolFee - 0.3%
      deadline
    );

    const receipt = await swapTx.wait();

    // Lưu thông tin giao dịch vào backend
    await fetch("/api/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userAddress: account,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        amountOutMinimum: (
          parseFloat(quote.amountOut) *
          (1 - params.slippage / 100)
        ).toString(),
        poolFee: 3000,
        txHash: receipt.transactionHash,
        status: "COMPLETED",
      }),
    });

    return receipt.transactionHash;
  } catch (error) {
    console.error("Lỗi khi thực hiện swap:", error);
    throw error;
  }
};
