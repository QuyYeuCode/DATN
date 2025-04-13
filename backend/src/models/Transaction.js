const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tx_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  tx_type: {
    type: DataTypes.ENUM('SWAP', 'LIMIT_ORDER', 'ADD_LIQUIDITY', 'REMOVE_LIQUIDITY', 'YIELD_DEPOSIT', 'YIELD_WITHDRAW'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'FAILED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  amount_in: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  token_in: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount_out: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  token_out: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gas_used: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  gas_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true
  },
  block_number: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Transaction;