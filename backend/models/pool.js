const mongoose = require("mongoose");

const poolSchema = new mongoose.Schema(
  {
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
    tick: {
      type: Number, // Tick hiện tại của pool
      required: true,
    },
    sqrtPriceX96: {
      type: String, // Giá hiện tại dưới dạng sqrt(price) * 2^96
      required: true,
    },
    observationIndex: {
      type: Number, // Chỉ số quan sát giá gần nhất
    },
    observationCardinality: {
      type: Number, // Số lượng quan sát giá được lưu trữ
    },
    liquidity: {
      type: String,
      default: "0",
    },
    sqrtPriceX96: {
      type: String,
      default: "0",
    },
    tick: {
      type: Number,
      default: 0,
    },
    token0Price: {
      type: Number,
      default: 0,
    },
    token1Price: {
      type: Number,
      default: 0,
    },
    volumeUSD24h: {
      type: Number,
      default: 0,
    },
    feesUSD24h: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Tạo compound index cho token0, token1 và fee
poolSchema.index({ token0: 1, token1: 1, fee: 1 }, { unique: true });

const Pool = mongoose.model("Pool", poolSchema);

module.exports = Pool;
