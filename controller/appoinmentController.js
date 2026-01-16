const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');

const appointmentController = {
  // Book appointment
  bookAppointment: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { 
        doctorId, 
        appointmentDate, 
        timeSlot, 
        appointmentType, 
        symptoms, 
        notes 
      } = req.body;

      // Check if doctor exists
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      // Check if doctor is available
      if (!doctor.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Doctor is not available for appointments'
        });
      }

      // Check for existing appointment at same time
      const existingAppointment = await Appointment.findOne({
        doctorId,
        appointmentDate: new Date(appointmentDate),
        timeSlot,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'This time slot is already booked'
        });
      }

      // Create appointment
      const appointment = new Appointment({
        patientId: userId,
        doctorId,
        appointmentDate: new Date(appointmentDate),
        timeSlot,
        appointmentType,
        symptoms,
        notes,
        consultationFee: doctor.consultationFee
      });

      await appointment.save();

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointment: {
          id: appointment._id,
          bookingId: appointment.bookingId,
          doctor: doctor.name,
          specialization: doctor.specialization,
          date: appointment.appointmentDate,
          time: appointment.timeSlot,
          type: appointment.appointmentType,
          status: appointment.status,
          fee: appointment.consultationFee
        }
      });

    } catch (error) {
      console.error('Book appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while booking appointment'
      });
    }
  },

  // Get user appointments
  getUserAppointments: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const appointments = await Appointment.find({ patientId: userId })
        .populate('doctorId', 'name specialization qualification experience consultationFee')
        .sort({ appointmentDate: -1 });

      res.json({
        success: true,
        appointments: appointments.map(appt => ({
          id: appt._id,
          bookingId: appt.bookingId,
          doctor: appt.doctorId?.name || 'Unknown',
          specialization: appt.doctorId?.specialization || 'Unknown',
          date: appt.appointmentDate,
          time: appt.timeSlot,
          type: appt.appointmentType,
          symptoms: appt.symptoms,
          notes: appt.notes,
          status: appt.status,
          fee: appt.consultationFee,
          paymentStatus: appt.paymentStatus,
          createdAt: appt.createdAt
        }))
      });

    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get appointment by ID
  getAppointmentById: async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id)
        .populate('patientId', 'username email phone')
        .populate('doctorId', 'name specialization qualification experience consultationFee');

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Check if user is authorized
      if (req.user.role !== 'admin' && appointment.patientId._id.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }

      res.json({
        success: true,
        appointment
      });

    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Update appointment status
  updateAppointmentStatus: async (req, res) => {
    try {
      const { status } = req.body;
      
      const appointment = await Appointment.findById(req.params.id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Update status
      appointment.status = status;
      appointment.updatedAt = new Date();
      
      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment status updated',
        appointment
      });

    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Cancel appointment
  cancelAppointment: async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Check if user is authorized
      if (req.user.role !== 'admin' && appointment.patientId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to cancel this appointment'
        });
      }

      // Check if appointment can be cancelled
      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: `Appointment is already ${appointment.status}`
        });
      }

      appointment.status = 'cancelled';
      appointment.updatedAt = new Date();
      
      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        appointment
      });

    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get all appointments (admin only)
  getAllAppointments: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        startDate, 
        endDate 
      } = req.query;

      const filter = {};
      
      if (status) filter.status = status;
      if (startDate && endDate) {
        filter.appointmentDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const appointments = await Appointment.find(filter)
        .populate('patientId', 'username email phone')
        .populate('doctorId', 'name specialization')
        .sort({ appointmentDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Appointment.countDocuments(filter);

      res.json({
        success: true,
        appointments,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      });

    } catch (error) {
      console.error('Get all appointments error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = appointmentController;