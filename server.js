const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { initFirebase } = require('./src/config/firebase');
const { cloudinaryConfig } = require('./src/config/cloudinary');

dotenv.config();

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/error');

const logger = require('./src/utils/logger');

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────
connectDB();

initFirebase();
if (!cloudinaryConfig()) {
  logger.warn('Cloudinary environment variables are not fully configured yet. Recipe image uploads will fail until they are set.');
}

// ─── Security Middleware ──────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use('/api', limiter);

// ─── General Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CalorieTrack API is running 🚀',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/v1/users', require('./src/routes/user.routes'));
app.use('/api/v1/foods', require('./src/routes/food.routes'));
app.use('/api/v1/recipes', require('./src/routes/recipe.routes'));
app.use('/api/v1/nutrition', require('./src/routes/nutrition.routes'));
// app.use('/api/v1/logs',  require('./src/routes/log.routes'));

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
