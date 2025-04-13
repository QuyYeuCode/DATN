const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const YieldPosition = sequelize.define('YieldPosition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false
  },
  protocol: {
    type: DataTypes.ENUM('AAVE', 'COMPOUND', 'CURVE', 'YEARN'),
    allowNull: false
  },
  apy: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false
  },
  deposit_timestamp: {
    type: DataTypes.DATE,
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
  tx_hash_deposit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tx_hash_withdraw: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = YieldPosition;