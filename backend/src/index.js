const { ethers } = require("ethers");
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Web3 = require("web3");
const axios = require("axios");

dotenv.config();

const LimitOrderWithYieldABI = [
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
];
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  LimitOrderWithYieldABI,
  wallet
);

// Khởi tạo Express và Socket.io
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Khoảng thời gian kiểm tra (mili giây)
const CHECK_INTERVAL = 60000; // Kiểm tra mỗi 1 phút
const GAS_PRICE_OFFSET = 10; // Thêm 10 Gwei vào gas price thị trường

// Lưu trữ dữ liệu orders để theo dõi
let pendingOrders = [];
let orderHistory = [];

// Hàm lấy danh sách orders đang chờ xử lý
async function fetchPendingOrders() {
  try {
    const orderCount = await contract.limitOrders.length;
    console.log(`Tổng số orders: ${orderCount}`);

    const newPendingOrders = [];

    for (let i = 0; i < orderCount; i++) {
      const orderDetails = await contract.getOrderDetails(i);

      // OrderStatus.PENDING = 0
      if (orderDetails.status === 0) {
        const order = {
          orderId: i,
          user: orderDetails.user,
          tokenIn: orderDetails.tokenIn,
          tokenOut: orderDetails.tokenOut,
          amountIn: ethers.utils.formatUnits(orderDetails.amountIn, 6), // Giả sử USDC có 6 decimals
          targetPrice: ethers.utils.formatUnits(orderDetails.targetPrice, 18),
          createdAt: new Date(
            orderDetails.createdAt.toNumber() * 1000
          ).toISOString(),
          currentInterest: ethers.utils.formatUnits(
            orderDetails.currentInterest,
            6
          ),
          protocol: ["NONE", "AAVE", "COMPOUND"][orderDetails.protocol],
        };

        newPendingOrders.push(order);
      }
    }

    pendingOrders = newPendingOrders;
    console.log(`Đã cập nhật ${pendingOrders.length} orders đang chờ`);

    // Gửi danh sách orders đến tất cả clients
    io.emit("pendingOrders", pendingOrders);

    return pendingOrders;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách orders:", error);
    return [];
  }
}

// Hàm kiểm tra và thực hiện các orders
async function checkAndExecuteOrders() {
  try {
    console.log("Đang kiểm tra và thực hiện orders...");

    const gasPrice = await provider.getGasPrice();
    const gasPriceOptimal = gasPrice.add(
      ethers.utils.parseUnits(GAS_PRICE_OFFSET.toString(), "gwei")
    );

    // Gọi hàm checkAndExecuteOrders từ contract
    const tx = await contract.checkAndExecuteOrders({
      gasLimit: 5000000,
      gasPrice: gasPriceOptimal,
    });

    console.log(`Giao dịch đã được gửi: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Giao dịch đã được xác nhận: ${receipt.transactionHash}`);

    // Cập nhật lại danh sách orders sau khi thực hiện
    await fetchPendingOrders();

    // Lấy các sự kiện OrderExecuted từ receipt
    const executedEvents = receipt.events.filter(
      (event) => event.event === "OrderExecuted"
    );

    for (const event of executedEvents) {
      const executedOrder = {
        orderId: event.args.orderId.toString(),
        user: event.args.user,
        tokenOut: event.args.tokenOut,
        amountOut: ethers.utils.formatEther(event.args.amountOut),
        interest: ethers.utils.formatUnits(event.args.interest, 6),
        executedAt: new Date().toISOString(),
        transactionHash: receipt.transactionHash,
      };

      orderHistory.push(executedOrder);
      io.emit("orderExecuted", executedOrder);
    }

    return true;
  } catch (error) {
    console.error("Lỗi khi thực hiện orders:", error);
    return false;
  }
}

// Hàm kiểm tra và cập nhật lending protocol nếu cần
async function checkAndUpdateProtocols() {
  try {
    console.log("Đang kiểm tra và cập nhật protocols...");

    for (const order of pendingOrders) {
      await contract.checkAndUpdateLendingProtocol(order.orderId, {
        gasLimit: 500000,
      });

      console.log(
        `Đã kiểm tra và cập nhật protocol cho order ${order.orderId}`
      );
    }

    // Cập nhật lại danh sách orders sau khi thực hiện
    await fetchPendingOrders();

    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật protocols:", error);
    return false;
  }
}

// Hàm lấy giá hiện tại của một token
async function getCurrentPrice(tokenIn, tokenOut) {
  try {
    const price = await contract.getCurrentPrice(tokenIn, tokenOut);
    return ethers.utils.formatUnits(price, 18);
  } catch (error) {
    console.error("Lỗi khi lấy giá hiện tại:", error);
    return "0";
  }
}

// API Routes
app.use(express.json());

// Lấy danh sách orders đang chờ
app.get("/api/orders/pending", async (req, res) => {
  try {
    const orders = await fetchPendingOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lấy lịch sử orders đã thực hiện
app.get("/api/orders/history", (req, res) => {
  res.json(orderHistory);
});

// Lấy chi tiết một order
app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderDetails = await contract.getOrderDetails(orderId);

    // Format dữ liệu để trả về
    const order = {
      orderId: orderId,
      user: orderDetails.user,
      tokenIn: orderDetails.tokenIn,
      tokenOut: orderDetails.tokenOut,
      amountIn: ethers.utils.formatUnits(orderDetails.amountIn, 6),
      targetPrice: ethers.utils.formatUnits(orderDetails.targetPrice, 18),
      createdAt: new Date(
        orderDetails.createdAt.toNumber() * 1000
      ).toISOString(),
      status: ["PENDING", "EXECUTED", "CANCELLED"][orderDetails.status],
      depositedAmount: ethers.utils.formatUnits(
        orderDetails.depositedAmount,
        6
      ),
      currentInterest: ethers.utils.formatUnits(
        orderDetails.currentInterest,
        6
      ),
      protocol: ["NONE", "AAVE", "COMPOUND"][orderDetails.protocol],
    };

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tạo order mới
app.post("/api/orders", async (req, res) => {
  try {
    const { tokenOut, amountIn, targetPrice } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!tokenOut || !amountIn || !targetPrice) {
      return res.status(400).json({ error: "Thiếu thông tin cần thiết" });
    }

    // Format dữ liệu
    const formattedAmountIn = ethers.utils.parseUnits(amountIn.toString(), 6);
    const formattedTargetPrice = ethers.utils.parseUnits(
      targetPrice.toString(),
      18
    );

    // Gọi contract để tạo order mới
    const tx = await contract.createLimitOrder(
      tokenOut,
      formattedAmountIn,
      formattedTargetPrice
    );
    const receipt = await tx.wait();

    // Lấy orderId từ event
    const orderCreatedEvent = receipt.events.find(
      (event) => event.event === "OrderCreated"
    );
    const orderId = orderCreatedEvent.args.orderId.toString();

    // Cập nhật lại danh sách orders
    await fetchPendingOrders();

    res.json({
      orderId,
      transactionHash: receipt.transactionHash,
      message: "Order được tạo thành công",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hủy order
app.post("/api/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Gọi contract để hủy order
    const tx = await contract.cancelOrder(orderId);
    const receipt = await tx.wait();

    // Cập nhật lại danh sách orders
    await fetchPendingOrders();

    res.json({
      orderId,
      transactionHash: receipt.transactionHash,
      message: "Order đã được hủy thành công",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io events
io.on("connection", (socket) => {
  console.log("Client đã kết nối:", socket.id);

  // Gửi dữ liệu hiện tại cho client mới kết nối
  socket.emit("pendingOrders", pendingOrders);
  socket.emit("orderHistory", orderHistory);

  socket.on("disconnect", () => {
    console.log("Client đã ngắt kết nối:", socket.id);
  });
});

// Khởi tạo server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);

  // Khởi tạo dữ liệu ban đầu
  fetchPendingOrders();

  // Thiết lập các interval để định kỳ kiểm tra và thực hiện orders
  setInterval(checkAndExecuteOrders, CHECK_INTERVAL);

  // Kiểm tra protocol mỗi giờ để tối ưu hóa yield
  setInterval(checkAndUpdateProtocols, CHECK_INTERVAL * 60); // 60 phút
});

// Lắng nghe các events từ contract
contract.on(
  "OrderCreated",
  async (orderId, user, tokenIn, tokenOut, amountIn, targetPrice) => {
    console.log(`Order mới được tạo: ${orderId}`);
    await fetchPendingOrders();

    const newOrder = {
      orderId: orderId.toString(),
      user,
      tokenIn,
      tokenOut,
      amountIn: ethers.utils.formatUnits(amountIn, 6),
      targetPrice: ethers.utils.formatUnits(targetPrice, 18),
      createdAt: new Date().toISOString(),
    };

    io.emit("newOrder", newOrder);
  }
);

contract.on("OrderExecuted", (orderId, user, tokenOut, amountOut, interest) => {
  console.log(`Order đã được thực hiện: ${orderId}`);

  const executedOrder = {
    orderId: orderId.toString(),
    user,
    tokenOut,
    amountOut: ethers.utils.formatEther(amountOut),
    interest: ethers.utils.formatUnits(interest, 6),
    executedAt: new Date().toISOString(),
  };

  orderHistory.push(executedOrder);
  io.emit("orderExecuted", executedOrder);

  // Cập nhật lại danh sách orders
  fetchPendingOrders();
});

contract.on("OrderCancelled", (orderId, user, returnedAmount, interest) => {
  console.log(`Order đã bị hủy: ${orderId}`);

  const cancelledOrder = {
    orderId: orderId.toString(),
    user,
    returnedAmount: ethers.utils.formatUnits(returnedAmount, 6),
    interest: ethers.utils.formatUnits(interest, 6),
    cancelledAt: new Date().toISOString(),
  };

  io.emit("orderCancelled", cancelledOrder);

  // Cập nhật lại danh sách orders
  fetchPendingOrders();
});

contract.on(
  "ProtocolChanged",
  (orderId, oldProtocol, newProtocol, interestEarned) => {
    console.log(
      `Protocol đã thay đổi cho order ${orderId}: ${oldProtocol} -> ${newProtocol}`
    );

    const protocolUpdate = {
      orderId: orderId.toString(),
      oldProtocol: ["NONE", "AAVE", "COMPOUND"][oldProtocol],
      newProtocol: ["NONE", "AAVE", "COMPOUND"][newProtocol],
      interestEarned: ethers.utils.formatUnits(interestEarned, 6),
      updatedAt: new Date().toISOString(),
    };

    io.emit("protocolChanged", protocolUpdate);

    // Cập nhật lại danh sách orders
    fetchPendingOrders();
  }
);

// Gửi dữ liệu thống kê mỗi 5 phút
setInterval(() => {
  const stats = {
    totalPendingOrders: pendingOrders.length,
    totalExecutedOrders: orderHistory.length,
    lastChecked: new Date().toISOString(),
  };

  io.emit("stats", stats);
}, 300000); // 5 phút
