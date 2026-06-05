const express = require('express');
const morgan = require('morgan');
const authMiddleware = require('./middleware/auth');

const app = express();

// Middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Public routes (no auth — metadata is public from the stream itself)
app.use('/api/meta', require('./routes/meta'));

// Protected routes with auth middleware
app.use('/api/favorites', authMiddleware, require('./routes/favorites'));
app.use('/api/apikey', authMiddleware, require('./routes/apikey'));
app.use('/api/settings', authMiddleware, require('./routes/settings'));
app.use('/api/sync', authMiddleware, require('./routes/sync'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal Server Error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Start server
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Radio432 API listening on port ${port}`);
});
