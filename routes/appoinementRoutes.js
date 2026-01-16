const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');

// User routes
router.post('/book', authMiddleware.isAuthenticated, appointmentController.bookAppointment);
router.get('/my-appointments', authMiddleware.isAuthenticated, appointmentController.getUserAppointments);
router.get('/:id', authMiddleware.isAuthenticated, appointmentController.getAppointmentById);
router.put('/:id/cancel', authMiddleware.isAuthenticated, appointmentController.cancelAppointment);

// Admin routes
router.get('/all', authMiddleware.isAuthenticated, authMiddleware.isAdmin, appointmentController.getAllAppointments);
router.put('/:id/status', authMiddleware.isAuthenticated, authMiddleware.isAdmin, appointmentController.updateAppointmentStatus);

module.exports = router;