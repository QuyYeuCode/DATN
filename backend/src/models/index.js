const sequelize = require('../config/database');
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const LimitOrder = require('./LimitOrder');
const LiquidityPosition = require('./LiquidityPosition');
const YieldPosition = require('./YieldPosition');
const TokenPrice = require('./TokenPrice');
const Notification = require('./Notification');

// Define associations that weren't defined in the model files

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Wallet,
  Transaction,
  LimitOrder,
  LiquidityPosition,
  YieldPosition,
  TokenPrice,
  Notification
};