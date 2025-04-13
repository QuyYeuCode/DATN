const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TokenPrice = sequelize.define('TokenPrice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  price_eth: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = TokenPrice;