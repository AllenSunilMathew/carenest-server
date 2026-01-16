const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware.isAuthenticated, authController.getProfile);
router.put('/profile', authMiddleware.isAuthenticated, authController.updateProfile);
router.put('/change-password', authMiddleware.isAuthenticated, authController.changePassword);
router.get('/verify', authMiddleware.isAuthenticated, authController.verifyToken);

module.exports = router;