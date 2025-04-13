const jwt = require('jsonwebtoken');
const { User, Wallet } = require('../models');
const { validationResult } = require('express-validator');

// Register a new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = await User.create({
      email,
      password_hash: password
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user info and token
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login with email/password
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Get user's wallets
    const wallets = await Wallet.findAll({
      where: { user_id: user.id },
      attributes: ['id', 'address', 'chain_id', 'is_primary']
    });

    // Return user info and token
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        wallets
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Connect a wallet address to user account
const connectWallet = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address, chain_id } = req.body;
    const userId = req.user.id;

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({
      where: { address }
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet already connected to an account' });
    }

    // Check if user has any wallets
    const walletCount = await Wallet.count({
      where: { user_id: userId }
    });

    // Create new wallet
    const wallet = await Wallet.create({
      user_id: userId,
      address,
      chain_id,
      is_primary: walletCount === 0 // First wallet is primary
    });

    return res.status(201).json({
      message: 'Wallet connected successfully',
      wallet: {
        id: wallet.id,
        address: wallet.address,
        chain_id: wallet.chain_id,
        is_primary: wallet.is_primary
      }
    });
  } catch (error) {
    console.error('Connect wallet error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user information
const getUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's wallets
    const wallets = await Wallet.findAll({
      where: { user_id: userId },
      attributes: ['id', 'address', 'chain_id', 'is_primary']
    });

    return res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        wallets
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user information
const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, password } = req.body;

    // Update user
    const user = await User.findByPk(userId);
    
    if (email) {
      // Check if email is already in use
      if (email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
        user.email = email;
      }
    }

    if (password) {
      user.password_hash = password;
    }

    await user.save();

    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  connectWallet,
  getUser,
  updateUser
};