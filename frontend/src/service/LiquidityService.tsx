import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import DexABI from "../abis/Dex.json";

const DEX_CONTRACT_ADDRESS = "0x87354828f54dBf1C9859F878909Ec88FAB420E5A";
const DEFAULT_SLIPPAGE = 0.5; // 0.5%
const DEFAULT_DEADLINE_MINUTES = 20;

export interface LiquidityParams {
  token0: string;
  token1: string;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  slippage?: number;
  deadline?: number;
}

export interface RemoveLiquidityParams {
  tokenId: string;
  liquidity: string;
  slippage?: number;
  deadline?: number;
}

export interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  tick: number;
  sqrtPriceX96: string;
  liquidity: string;
  token0Price: number;
  token1Price: number;
}

export interface LiquidityPosition {
  userAddress: string;
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
  txHash?: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  timestamp: string;
}

// Lấy thông tin pool
export const getPoolInfo = async (
  token0: string,
  token1: string,
  fee: number
): Promise<PoolInfo> => {
  try {
    const response = await fetch(
      `/api/pool-info?token0=${token0}&token1=${token1}&fee=${fee}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Lỗi khi lấy thông tin pool");
    }

    return data.data;
  } catch (error) {
    console.error("Lỗi khi lấy thông tin pool:", error);
    throw error;
  }
};

// Tính toán giá trị thanh khoản
export const calculateLiquidity = async (
  params: LiquidityParams
): Promise<{
  liquidity: string;
  amount0: string;
  amount1: string;
}> => {
  try {
    const response = await fetch("/api/calculate-liquidity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Lỗi khi tính toán giá trị thanh khoản");
    }

    return data.data;
  } catch (error) {
    console.error("Lỗi khi tính toán giá trị thanh khoản:", error);
    throw error;
  }
};

// Thêm thanh khoản
export const addLiquidity = async (
  params: LiquidityParams
): Promise<string> => {
  const { provider, signer, account } = useWallet();

  if (!provider || !signer || !account) {
    throw new Error("Wallet not connected");
  }

  try {
    const dexContract = new ethers.Contract(
      "0x87354828f54dBf1C9859F878909Ec88FAB420E5A",
      DexABI,
      signer
    );

    // Approve token0
    const token0Contract = new ethers.Contract(
      params.token0,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
      ],
      signer
    );

    await token0Contract.approve(
      "0x87354828f54dBf1C9859F878909Ec88FAB420E5A",
      params.amount0Desired
    );

    // Approve token1
    const token1Contract = new ethers.Contract(
      params.token1,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
      ],
      signer
    );

    await token1Contract.approve(
      "0x87354828f54dBf1C9859F878909Ec88FAB420E5A",
      params.amount1Desired
    );

    // Tính toán slippage
    const slippage = params.slippage || DEFAULT_SLIPPAGE;
    const amount0Min = ethers.parseUnits(
      (parseFloat(params.amount0Desired) * (1 - slippage / 100))
        .toFixed(0)
        .toString(),
      0
    );
    const amount1Min = ethers.parseUnits(
      (parseFloat(params.amount1Desired) * (1 - slippage / 100))
        .toFixed(0)
        .toString(),
      0
    );

    // Thực hiện giao dịch
    const tx = await dexContract.addLiquidity(
      params.token0,
      params.token1,
      params.amount0Desired,
      params.amount1Desired,
      amount0Min,
      amount1Min,
      params.fee,
      params.tickLower,
      params.tickUpper
    );

    // Lưu thông tin giao dịch vào backend
    const receipt = await tx.wait();
    const tokenId = receipt.events
      .find((e) => e.event === "LiquidityAdded")
      .args.tokenId.toString();
    const liquidity = receipt.events
      .find((e) => e.event === "LiquidityAdded")
      .args.liquidity.toString();
    const amount0 = receipt.events
      .find((e) => e.event === "LiquidityAdded")
      .args.amount0.toString();
    const amount1 = receipt.events
      .find((e) => e.event === "LiquidityAdded")
      .args.amount1.toString();

    await fetch("/api/add-liquidity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userAddress: account,
        tokenId,
        token0: params.token0,
        token1: params.token1,
        fee: params.fee,
        tickLower: params.tickLower,
        tickUpper: params.tickUpper,
        liquidity,
        amount0,
        amount1,
        txHash: tx.hash,
        status: "COMPLETED",
      }),
    });

    return tx.hash;
  } catch (error) {
    console.error("Lỗi khi thêm thanh khoản:", error);
    throw error;
  }
};

// Rút thanh khoản
export const removeLiquidity = async (
  params: RemoveLiquidityParams
): Promise<string> => {
  const { provider, signer, account } = useWallet();

  if (!provider || !signer || !account) {
    throw new Error("Wallet not connected");
  }

  try {
    const dexContract = new ethers.Contract(
      "0x87354828f54dBf1C9859F878909Ec88FAB420E5A",
      DexABI,
      signer
    );

    // Thực hiện giao dịch
    const tx = await dexContract.removeLiquidity(
      params.tokenId,
      params.liquidity
    );

    // Lưu thông tin giao dịch vào backend
    const receipt = await tx.wait();
    const amount0 = receipt.events
      .find((e) => e.event === "LiquidityRemoved")
      .args.amount0.toString();
    const amount1 = receipt.events
      .find((e) => e.event === "LiquidityRemoved")
      .args.amount1.toString();

    await fetch("/api/remove-liquidity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokenId: params.tokenId,
        liquidity: params.liquidity,
        amount0,
        amount1,
        txHash: tx.hash,
        status: "COMPLETED",
      }),
    });

    return tx.hash;
  } catch (error) {
    console.error("Lỗi khi rút thanh khoản:", error);
    throw error;
  }
};

// Lấy danh sách vị trí thanh khoản của người dùng
export const getUserLiquidityPositions = async (
  userAddress: string
): Promise<LiquidityPosition[]> => {
  try {
    const response = await fetch(`/api/liquidity-positions/${userAddress}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || "Lỗi khi lấy danh sách vị trí thanh khoản"
      );
    }

    return data.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách vị trí thanh khoản:", error);
    throw error;
  }
};
