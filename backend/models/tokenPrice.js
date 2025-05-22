const mongoose = require("mongoose");

const tokenPriceSchema = new mongoose.Schema(
  {
    tokenAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: true,
    },
    priceChange24h: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index để tối ưu truy vấn
tokenPriceSchema.index({ tokenAddress: 1 });

const TokenPrice = mongoose.model("TokenPrice", tokenPriceSchema);

module.exports = TokenPrice;
