// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// Rate limiter cho API calls
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit mỗi IP tới 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter nghiêm ngặt hơn cho order creation
const orderCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit mỗi IP tới 5 order creation requests per 5 minutes
  message: {
    success: false,
    message: "Too many order creation attempts, please try again later.",
  },
});

module.exports = {
  rateLimiter,
  orderCreationLimiter,
};
