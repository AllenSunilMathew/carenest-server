const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const authMiddleware = require('../middleware/authMiddleware');

// User routes
router.post('/book', authMiddleware.isAuthenticated, labController.bookLabTest);
router.get('/my-tests', authMiddleware.isAuthenticated, labController.getUserLabTests);
router.get('/:id', authMiddleware.isAuthenticated, labController.getLabTestById);

// Admin routes
router.get('/all', authMiddleware.isAuthenticated, authMiddleware.isAdmin, labController.getAllLabTests);
router.put('/:id/status', authMiddleware.isAuthenticated, authMiddleware.isAdmin, labController.updateLabTestStatus);
router.put('/:id/upload-report', authMiddleware.isAuthenticated, authMiddleware.isAdmin, labController.uploadReport);

module.exports = router;