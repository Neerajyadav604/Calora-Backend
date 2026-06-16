const { admin } = require('../config/firebase');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    // 1. Check if token exists in header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.',
      });
    }

    // 2. Extract token
    const token = authHeader.split(' ')[1];

    // 3. Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // 4. Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || '',
      photoURL: decodedToken.picture || decodedToken.photoURL || '',
    };

    logger.info(`Auth: ${req.user.email} accessed ${req.method} ${req.originalUrl}`);

    next();
  } catch (error) {
    logger.error(`Auth failed: ${error.message}`);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.',
    });
  }
};

module.exports = { protect };
