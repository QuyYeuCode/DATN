const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema(
  {
    userAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tokenId: {
      type: Number,
      required: true,
      unique: true,
    },
    token0: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    token1: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fee: {
      type: Number,
      required: true,
    },
    tickLower: {
      type: Number,
      required: true,
    },
    tickUpper: {
      type: Number,
      required: true,
    },
    liquidity: {
      type: String,
      default: "0",
    },
    amount0: {
      type: String,
      default: "0",
    },
    amount1: {
      type: String,
      default: "0",
    },
    feeGrowthInside0LastX128: {
      type: String,
      default: "0",
    },
    feeGrowthInside1LastX128: {
      type: String,
      default: "0",
    },
    tokensOwed0: {
      type: String,
      default: "0",
    },
    tokensOwed1: {
      type: String,
      default: "0",
    },
    txHash: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index để tối ưu truy vấn
positionSchema.index({ userAddress: 1 });
positionSchema.index({ tokenId: 1 }, { unique: true });

const Position = mongoose.model("Position", positionSchema);

module.exports = Position;
