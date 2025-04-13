const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LiquidityPosition = sequelize.define('LiquidityPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'NFT ID'
  },
  pool_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token0: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token1: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount0: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  amount1: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  fee_tier: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tick_lower: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tick_upper: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  tx_hash_create: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tx_hash_update: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = LiquidityPosition;