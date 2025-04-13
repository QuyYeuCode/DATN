const jwt = require('jsonwebtoken');
const { User, Wallet } = require('../models');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware to verify wallet ownership
const verifyWalletOwnership = async (req, res, next) => {
  try {
    const { wallet_address } = req.body;
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address is required.' });
    }

    // Check if wallet belongs to user
    const wallet = await Wallet.findOne({
      where: {
        user_id: req.user.id,
        address: wallet_address
      }
    });

    if (!wallet) {
      return res.status(403).json({ error: 'Wallet not associated with this account.' });
    }

    // Attach wallet to request object
    req.wallet = wallet;
    next();
  } catch (error) {
    console.error('Wallet verification error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = {
  verifyToken,
  verifyWalletOwnership
};