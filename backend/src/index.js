require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const swapRoutes = require('./routes/swap.routes');
const limitOrderRoutes = require('./routes/limitOrder.routes');
const liquidityRoutes = require('./routes/liquidity.routes');
const yieldRoutes = require('./routes/yield.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/limit-orders', limitOrderRoutes);
app.use('/api/liquidity', liquidityRoutes);
app.use('/api/yield', yieldRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Sync database models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized');

    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();