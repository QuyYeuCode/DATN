const errorHandler = (err, req, res, next) => {
  console.error("Error stack:", err.stack);

  // MongoDB validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field}`,
      error: err.keyValue,
    });
  }

  // Ethereum/Contract errors
  if (err.code === "CALL_EXCEPTION" || err.reason) {
    return res.status(400).json({
      success: false,
      message: "Contract Error",
      error: err.reason || err.message,
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

module.exports = errorHandler;
