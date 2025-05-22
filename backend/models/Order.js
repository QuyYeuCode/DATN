// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    tokenIn: {
      type: String,
      required: true,
      lowercase: true,
    },
    tokenOut: {
      type: String,
      required: true,
      lowercase: true,
    },
    amountIn: {
      type: Number,
      required: true,
      min: 0,
    },
    targetPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    txHash: {
      type: String,
      required: true,
    },
    blockNumber: {
      type: Number,
      required: true,
    },
    executeTxHash: String,
    cancelTxHash: String,

    // Yield farming info
    depositedAmount: Number,
    accruedInterest: {
      type: Number,
      default: 0,
    },
    currentProtocol: {
      type: String,
      enum: ["NONE", "AAVE", "COMPOUND"],
      default: "NONE",
    },
    protocolTokenAddress: String,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    executedAt: Date,
    cancelledAt: Date,

    // Metadata
    gasUsed: Number,
    gasPrice: String,
    executionPrice: Number, // Giá thực tế khi execute
    slippage: Number,

    // Tags for filtering
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
orderSchema.index({ userAddress: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ tokenOut: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for total amount including interest
orderSchema.virtual("totalAmount").get(function () {
  return this.depositedAmount + this.accruedInterest;
});

// Methods
orderSchema.methods.isPending = function () {
  return this.status === "PENDING";
};

orderSchema.methods.isExecuted = function () {
  return this.status === "EXECUTED";
};

orderSchema.methods.isCancelled = function () {
  return this.status === "CANCELLED";
};

// Static methods
orderSchema.statics.findByUser = function (userAddress, options = {}) {
  const query = { userAddress: userAddress.toLowerCase() };

  if (options.status) {
    query.status = options.status.toUpperCase();
  }

  if (options.tokenOut) {
    query.tokenOut = options.tokenOut.toLowerCase();
  }

  return this.find(query).sort({ createdAt: -1 });
};

orderSchema.statics.findPending = function () {
  return this.find({ status: "PENDING" }).sort({ createdAt: -1 });
};

orderSchema.statics.getStats = function (userAddress = null) {
  const matchQuery = userAddress
    ? { userAddress: userAddress.toLowerCase() }
    : {};

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalVolume: { $sum: "$amountIn" },
        totalInterest: { $sum: "$accruedInterest" },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
        },
        executed: {
          $sum: { $cond: [{ $eq: ["$status", "EXECUTED"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
        },
      },
    },
  ]);
};

// Pre-save middleware
orderSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Post-save middleware
orderSchema.post("save", function (doc) {
  console.log(`Order ${doc.orderId} saved with status: ${doc.status}`);
});

module.exports = mongoose.model("Order", orderSchema);
