// controllers/orderController.js
const Order = require("../models/Order");
const { ethers } = require("ethers");
const contractABI = require("../abis/LimitOrder.json");

class OrderController {
  constructor() {
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_KEY);
    this.contract = new ethers.Contract(
      process.env.DEX_ADDRESS,
      contractABI,
      this.provider
    );
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.contractWithSigner = this.contract.connect(this.wallet);
  }

  // Tạo limit order mới
  async createOrder(req, res) {
    try {
      const { userAddress, tokenOut, amountIn, targetPrice, signature } =
        req.body;

      // Validate input
      if (!userAddress || !tokenOut || !amountIn || !targetPrice) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters",
        });
      }

      // Verify signature (optional security check)
      // ... signature verification logic

      // Tạo transaction
      const tx = await this.contractWithSigner.createLimitOrder(
        tokenOut,
        ethers.utils.parseUnits(amountIn.toString(), 6), // USDC có 6 decimals
        ethers.utils.parseEther(targetPrice.toString())
      );

      const receipt = await tx.wait();

      // Lấy orderId từ event
      const orderCreatedEvent = receipt.events.find(
        (event) => event.event === "OrderCreated"
      );
      const orderId = orderCreatedEvent.args.orderId.toString();

      // Lưu vào database
      const newOrder = new Order({
        orderId: orderId,
        userAddress: userAddress.toLowerCase(),
        tokenIn: process.env.USDC_ADDRESS,
        tokenOut: tokenOut.toLowerCase(),
        amountIn: amountIn,
        targetPrice: targetPrice,
        status: "PENDING",
        txHash: tx.hash,
        createdAt: new Date(),
        blockNumber: receipt.blockNumber,
      });

      await newOrder.save();

      res.json({
        success: true,
        data: {
          orderId,
          txHash: tx.hash,
          order: newOrder,
        },
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Hủy order
  async cancelOrder(req, res) {
    try {
      const { orderId, userAddress } = req.body;

      // Kiểm tra order trong database
      const order = await Order.findOne({
        orderId,
        userAddress: userAddress.toLowerCase(),
      });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled",
        });
      }

      // Thực hiện cancel trên contract
      const tx = await this.contractWithSigner.cancelOrder(orderId);
      const receipt = await tx.wait();

      // Cập nhật database
      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      order.cancelTxHash = tx.hash;
      await order.save();

      res.json({
        success: true,
        data: {
          txHash: tx.hash,
          order,
        },
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy danh sách order của user
  async getUserOrders(req, res) {
    try {
      const { userAddress } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const query = { userAddress: userAddress.toLowerCase() };
      if (status) {
        query.status = status.toUpperCase();
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("tokenIn tokenOut", "symbol name decimals");

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy chi tiết order
  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;

      // Lấy từ contract để có data real-time
      const orderDetails = await this.contract.getOrderDetails(orderId);

      // Lấy từ database để có thêm metadata
      const dbOrder = await Order.findOne({ orderId });

      const result = {
        orderId,
        user: orderDetails.user,
        tokenIn: orderDetails.tokenIn,
        tokenOut: orderDetails.tokenOut,
        amountIn: ethers.utils.formatUnits(orderDetails.amountIn, 6),
        targetPrice: ethers.utils.formatEther(orderDetails.targetPrice),
        createdAt: new Date(orderDetails.createdAt.toNumber() * 1000),
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
        txHash: dbOrder?.txHash,
        metadata: dbOrder,
      };

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get order details error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Lấy tất cả pending orders (cho bot monitoring)
  async getPendingOrders(req, res) {
    try {
      const orders = await Order.find({ status: "PENDING" }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Get pending orders error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Cập nhật trạng thái order (được gọi bởi event listener)
  async updateOrderStatus(orderId, status, txHash = null) {
    try {
      const updateData = {
        status: status.toUpperCase(),
        updatedAt: new Date(),
      };

      if (status === "EXECUTED") {
        updateData.executedAt = new Date();
        updateData.executeTxHash = txHash;
      }

      await Order.findOneAndUpdate({ orderId }, updateData, { new: true });

      console.log(`Order ${orderId} updated to ${status}`);
    } catch (error) {
      console.error("Update order status error:", error);
    }
  }

  // Thống kê tổng quan
  async getOrderStats(req, res) {
    try {
      const { userAddress } = req.query;

      const matchQuery = userAddress
        ? { userAddress: userAddress.toLowerCase() }
        : {};

      const stats = await Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
            },
            executedOrders: {
              $sum: { $cond: [{ $eq: ["$status", "EXECUTED"] }, 1, 0] },
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
            },
            totalVolume: { $sum: "$amountIn" },
          },
        },
      ]);

      res.json({
        success: true,
        data: stats[0] || {
          totalOrders: 0,
          pendingOrders: 0,
          executedOrders: 0,
          cancelledOrders: 0,
          totalVolume: 0,
        },
      });
    } catch (error) {
      console.error("Get order stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new OrderController();
