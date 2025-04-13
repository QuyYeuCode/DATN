const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LimitOrder = sequelize.define('LimitOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Order ID from smart contract'
  },
  token_in: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token_out: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount_in: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  amount_out_min: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fee: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'EXECUTED', 'CANCELLED', 'EXPIRED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  },
  use_yield: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  executed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tx_hash_create: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tx_hash_execute: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tx_hash_cancel: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = LimitOrder;