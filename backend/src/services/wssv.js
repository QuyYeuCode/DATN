const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const ethers = require("ethers");
import * as dotenv from "dotenv";
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("Client connected");

  sendInitialData(ws);

  ws.on("close", () => {
    clients.delete(ws);
    console.log("Client disconnected");
  });

  // Xử lý tin nhắn từ client
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Xử lý yêu cầu từ client (ví dụ: chi tiết một order cụ thể)
    if (data.type === "getOrderDetails") {
      sendOrderDetails(ws, data.orderId);
    }
  });
});

// Gửi dữ liệu khởi tạo cho client mới
async function sendInitialData(ws) {
  try {
    const pendingOrders = await getPendingOrders();
    ws.send(
      JSON.stringify({
        type: "initialData",
        pendingOrders,
      })
    );
  } catch (error) {
    console.error("Error sending initial data:", error);
  }
}

// Gửi chi tiết order cho client
async function sendOrderDetails(ws, orderId) {
  try {
    const details = await contract.getOrderDetails(orderId);
    ws.send(
      JSON.stringify({
        type: "orderDetails",
        orderId,
        details: {
          user: details.user,
          tokenIn: details.tokenIn,
          tokenOut: details.tokenOut,
          amountIn: ethers.utils.formatUnits(details.amountIn, 6), // Giả sử USDC 6 decimals
          targetPrice: ethers.utils.formatUnits(details.targetPrice, 18),
          createdAt: new Date(
            details.createdAt.toNumber() * 1000
          ).toISOString(),
          status: ["PENDING", "EXECUTED", "CANCELLED"][details.status],
          depositedAmount: ethers.utils.formatUnits(details.depositedAmount, 6),
          currentInterest: ethers.utils.formatUnits(details.currentInterest, 6),
          protocol: ["NONE", "AAVE", "COMPOUND"][details.protocol],
        },
      })
    );
  } catch (error) {
    console.error(`Error fetching order details for ${orderId}:`, error);
  }
}

// Lắng nghe sự kiện từ smart contract
function listenToContractEvents() {
  // Sự kiện OrderCreated
  contract.on(
    "OrderCreated",
    (orderId, user, tokenIn, tokenOut, amountIn, targetPrice, event) => {
      const data = {
        type: "orderCreated",
        orderId: orderId.toString(),
        user,
        tokenIn,
        tokenOut,
        amountIn: ethers.utils.formatUnits(amountIn, 6),
        targetPrice: ethers.utils.formatUnits(targetPrice, 18),
      };

      broadcastToAll(data);
    }
  );

  // Sự kiện OrderExecuted
  contract.on(
    "OrderExecuted",
    (orderId, user, tokenOut, amountOut, interest, event) => {
      const data = {
        type: "orderExecuted",
        orderId: orderId.toString(),
        user,
        tokenOut,
        amountOut: ethers.utils.formatUnits(amountOut, 18), // Decimals của tokenOut
        interest: ethers.utils.formatUnits(interest, 6),
      };

      broadcastToAll(data);
    }
  );

  // Sự kiện OrderCancelled
  contract.on(
    "OrderCancelled",
    (orderId, user, returnedAmount, interest, event) => {
      const data = {
        type: "orderCancelled",
        orderId: orderId.toString(),
        user,
        returnedAmount: ethers.utils.formatUnits(returnedAmount, 6),
        interest: ethers.utils.formatUnits(interest, 6),
      };

      broadcastToAll(data);
    }
  );

  // Sự kiện ProtocolChanged
  contract.on(
    "ProtocolChanged",
    (orderId, oldProtocol, newProtocol, interestEarned, event) => {
      const data = {
        type: "protocolChanged",
        orderId: orderId.toString(),
        oldProtocol: ["NONE", "AAVE", "COMPOUND"][oldProtocol],
        newProtocol: ["NONE", "AAVE", "COMPOUND"][newProtocol],
        interestEarned: ethers.utils.formatUnits(interestEarned, 6),
      };

      broadcastToAll(data);
    }
  );
}

// Gửi dữ liệu đến tất cả clients
function broadcastToAll(data) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function updateMarketPrices() {
  const uniqueTokens = new Set();
  const orderCount = await contract.limitOrders.length;

  for (let i = 0; i < orderCount; i++) {
    const order = await contract.limitOrders(i);
    uniqueTokens.add(order.tokenOut);
  }

  setInterval(async () => {
    const prices = {};

    for (const token of uniqueTokens) {
      try {
        const symbol = await getTokenSymbol(token);
        const price = await getPriceFromBinance(symbol);
        prices[token] = price;
      } catch (error) {
        console.error(`Error updating price for token ${token}:`, error);
      }
    }

    broadcastToAll({
      type: "marketPrices",
      prices,
    });
  }, 5000); // Cập nhật mỗi 5 giây
}

// Bắt đầu server
server.listen(3000, () => {
  console.log("WebSocket server started on port 3000");
  listenToContractEvents();
  updateMarketPrices();
});
