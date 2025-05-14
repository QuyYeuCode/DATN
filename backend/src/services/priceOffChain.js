const ethers = require("ethers");
const axios = require("axios");
const WebSocket = require("ws");

// Cấu hình
const CONTRACT_ADDRESS = "0xYourContractAddress";
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_uniswapRouter",
        type: "address",
      },
      {
        internalType: "address",
        name: "_usdcAddress",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "additionalInterest",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalInterest",
        type: "uint256",
      },
    ],
    name: "InterestAccrued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "returnedAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "interest",
        type: "uint256",
      },
    ],
    name: "OrderCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "targetPrice",
        type: "uint256",
      },
    ],
    name: "OrderCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amountOut",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "interest",
        type: "uint256",
      },
    ],
    name: "OrderExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "oldProtocol",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "newProtocol",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "interestEarned",
        type: "uint256",
      },
    ],
    name: "ProtocolChanged",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "protocol",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "poolAddress",
        type: "address",
      },
    ],
    name: "addLendingProtocol",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
    ],
    name: "cancelOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "checkAndExecuteOrders",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
    ],
    name: "checkAndUpdateLendingProtocol",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "targetPrice",
        type: "uint256",
      },
    ],
    name: "createLimitOrder",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
    ],
    name: "executeOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
    ],
    name: "getCurrentPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "orderId",
        type: "uint256",
      },
    ],
    name: "getOrderDetails",
    outputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "targetPrice",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
      {
        internalType: "enum LimitOrderWithYield.OrderStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "depositedAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentInterest",
        type: "uint256",
      },
      {
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "protocol",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserOrders",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "limitOrders",
    outputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenIn",
        type: "address",
      },
      {
        internalType: "address",
        name: "tokenOut",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "targetPrice",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
      {
        internalType: "enum LimitOrderWithYield.OrderStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "depositedAmount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "accruedInterest",
        type: "uint256",
      },
      {
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "currentProtocol",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "protocolTokenAddress",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "priceOracles",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "oracle",
        type: "address",
      },
    ],
    name: "setTokenOracle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "enum LimitOrderWithYield.LendingProtocol",
        name: "",
        type: "uint8",
      },
    ],
    name: "supportedProtocols",
    outputs: [
      {
        internalType: "address",
        name: "lendingPool",
        type: "address",
      },
      {
        internalType: "bool",
        name: "isActive",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapRouter",
    outputs: [
      {
        internalType: "contract ISwapRouter",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "usdcAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userOrders",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]; // ABI từ contract của bạn
const RPC_URL = "https://mainnet.infura.io/v3/YOUR_KEY";
const PRIVATE_KEY = "your_private_key"; 
const CHECK_INTERVAL = 30000; 

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);


async function getPriceFromBinance(tokenSymbol) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${tokenSymbol}USDT`
    );
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Error fetching price from Binance: ${error.message}`);
    return null;
  }
}

// Lấy danh sách các pending orders
async function getPendingOrders() {
  try {
    const orderCount = await contract.limitOrders.length;
    const pendingOrders = [];

    for (let i = 0; i < orderCount; i++) {
      const orderStatus = (await contract.limitOrders(i)).status;
      if (orderStatus === 0) {
        // PENDING = 0
        pendingOrders.push(i);
      }
    }

    return pendingOrders;
  } catch (error) {
    console.error(`Error getting pending orders: ${error.message}`);
    return [];
  }
}

// Kiểm tra và thực thi các lệnh
async function checkAndExecuteOrders() {
  try {
    // Gọi hàm checkAndExecuteOrders trên smart contract
    const tx = await contract.checkAndExecuteOrders();
    await tx.wait();
    console.log(`Successfully checked and executed orders: ${tx.hash}`);
  } catch (error) {
    console.error(`Error executing orders: ${error.message}`);
  }
}

// Cập nhật lending protocol để tối ưu lợi nhuận
async function updateLendingProtocols() {
  try {
    const pendingOrders = await getPendingOrders();

    for (const orderId of pendingOrders) {
      const tx = await contract.checkAndUpdateLendingProtocol(orderId);
      await tx.wait();
      console.log(`Updated lending protocol for order ${orderId}: ${tx.hash}`);
    }
  } catch (error) {
    console.error(`Error updating lending protocols: ${error.message}`);
  }
}

// Chạy định kỳ
async function start() {
  console.log("Starting price monitoring service...");

  // Chạy checkAndExecuteOrders định kỳ
  setInterval(async () => {
    await checkAndExecuteOrders();
  }, CHECK_INTERVAL);

  // Cập nhật lending protocols ít thường xuyên hơn (6 giờ một lần)
  setInterval(async () => {
    await updateLendingProtocols();
  }, 6 * 60 * 60 * 1000);
}

start();
