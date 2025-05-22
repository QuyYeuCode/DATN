// middleware/validation.js
const { ethers } = require("ethers");

// Validate order creation
const validateOrder = (req, res, next) => {
  const { userAddress, tokenOut, amountIn, targetPrice } = req.body;

  const errors = [];

  // Validate user address
  if (!userAddress || !ethers.utils.isAddress(userAddress)) {
    errors.push("Invalid user address");
  }

  // Validate token address
  if (!tokenOut || !ethers.utils.isAddress(tokenOut)) {
    errors.push("Invalid token out address");
  }

  // Validate amount
  if (!amountIn || isNaN(amountIn) || parseFloat(amountIn) <= 0) {
    errors.push("Invalid amount in");
  }

  // Validate target price
  if (!targetPrice || isNaN(targetPrice) || parseFloat(targetPrice) <= 0) {
    errors.push("Invalid target price");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

// Validate address parameter
const validateAddress = (req, res, next) => {
  const { userAddress } = req.params;

  if (!userAddress || !ethers.utils.isAddress(userAddress)) {
    return res.status(400).json({
      success: false,
      message: "Invalid address parameter",
    });
  }

  next();
};

// Validate pagination
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: "Invalid page parameter",
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: "Invalid limit parameter (1-100)",
    });
  }

  next();
};

module.exports = {
  validateOrder,
  validateAddress,
  validatePagination,
};
