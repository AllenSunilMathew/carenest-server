const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require admin privileges
router.use(authMiddleware.isAuthenticated, authMiddleware.isAdmin);

// Dashboard
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/monthly-stats', adminController.getMonthlyStats);

// Users
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

module.exports = router;