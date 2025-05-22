const mongoose = require("mongoose");

const swapSchema = new mongoose.Schema(
  {
    userAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tokenIn: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tokenOut: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    amountIn: {
      type: String,
      required: true,
    },
    amountOut: {
      type: String,
      required: true,
    },
    amountOutMinimum: {
      type: String,
      required: true,
    },
    poolFee: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index để tối ưu truy vấn
swapSchema.index({ userAddress: 1 });
swapSchema.index({ txHash: 1 });

const Swap = mongoose.model("Swap", swapSchema);

module.exports = Swap;
