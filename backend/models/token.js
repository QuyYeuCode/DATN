const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    decimals: {
      type: Number,
      required: true,
      default: 18,
    },
    logoURI: {
      type: String,
      default: "",
    },
    chainId: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
