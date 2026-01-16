const User = require('../models/User');
const Appointment = require('../models/Appointment');
const LabTest = require('../models/LabTest');
const Doctor = require('../models/Doctor');

const adminController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get counts
      const [
        totalUsers,
        totalDoctors,
        totalAppointments,
        totalLabTests,
        todayAppointments,
        todayLabTests,
        pendingAppointments,
        pendingLabResults,
        newUsersToday
      ] = await Promise.all([
        User.countDocuments(),
        Doctor.countDocuments({ isActive: true }),
        Appointment.countDocuments(),
        LabTest.countDocuments(),
        Appointment.countDocuments({ 
          appointmentDate: { 
            $gte: new Date().setHours(0,0,0,0),
            $lt: new Date().setHours(23,59,59,999)
          }
        }),
        LabTest.countDocuments({ 
          testDate: { 
            $gte: new Date().setHours(0,0,0,0),
            $lt: new Date().setHours(23,59,59,999)
          }
        }),
        Appointment.countDocuments({ status: 'pending' }),
        LabTest.countDocuments({ status: { $in: ['scheduled', 'in-progress'] } }),
        User.countDocuments({ 
          createdAt: { 
            $gte: new Date().setHours(0,0,0,0),
            $lt: new Date().setHours(23,59,59,999)
          }
        })
      ]);

      // Calculate revenue
      const completedAppointments = await Appointment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$consultationFee' } } }
      ]);

      const completedLabTests = await LabTest.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const appointmentRevenue = completedAppointments[0]?.total || 0;
      const labRevenue = completedLabTests[0]?.total || 0;
      const totalRevenue = appointmentRevenue + labRevenue;

      // Get recent activity
      const recentAppointments = await Appointment.find()
        .populate('patientId', 'username')
        .populate('doctorId', 'name')
        .sort({ createdAt: -1 })
        .limit(5);

      const recentLabTests = await LabTest.find()
        .populate('patientId', 'username')
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalDoctors,
          totalAppointments,
          totalLabTests,
          todayAppointments,
          todayLabTests,
          pendingAppointments,
          pendingLabResults,
          newUsersToday,
          appointmentRevenue,
          labRevenue,
          totalRevenue,
          activeDoctors: totalDoctors
        },
        recentAppointments: recentAppointments.map(apt => ({
          id: apt._id,
          bookingId: apt.bookingId,
          patient: apt.patientId?.username || 'Unknown',
          doctor: apt.doctorId?.name || 'Unknown',
          date: apt.appointmentDate,
          time: apt.timeSlot,
          type: apt.appointmentType,
          status: apt.status,
          amount: apt.consultationFee
        })),
        recentLabTests: recentLabTests.map(test => ({
          id: test._id,
          bookingId: test.bookingId,
          patient: test.patientId?.username || 'Unknown',
          test: test.testName,
          date: test.testDate,
          time: test.timeSlot,
          status: test.status,
          amount: test.amount,
          reportAvailable: test.reportAvailable
        }))
      });

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, role, search } = req.query;

      const filter = {};
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Update user status
  updateUserStatus: async (req, res) => {
    try {
      const { isActive } = req.body;
      
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        message: 'User status updated',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get monthly statistics
  getMonthlyStats: async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      // Monthly appointments
      const monthlyAppointments = await Appointment.aggregate([
        {
          $match: {
            appointmentDate: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31`)
            }
          }
        },
        {
          $group: {
            _id: { $month: '$appointmentDate' },
            count: { $sum: 1 },
            revenue: { $sum: '$consultationFee' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Monthly lab tests
      const monthlyLabTests = await LabTest.aggregate([
        {
          $match: {
            testDate: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31`)
            }
          }
        },
        {
          $group: {
            _id: { $month: '$testDate' },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Format data for charts
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const appointmentData = Array(12).fill(0);
      const labData = Array(12).fill(0);
      const appointmentRevenueData = Array(12).fill(0);
      const labRevenueData = Array(12).fill(0);

      monthlyAppointments.forEach(item => {
        appointmentData[item._id - 1] = item.count;
        appointmentRevenueData[item._id - 1] = item.revenue;
      });

      monthlyLabTests.forEach(item => {
        labData[item._id - 1] = item.count;
        labRevenueData[item._id - 1] = item.revenue;
      });

      res.json({
        success: true,
        months,
        appointmentData,
        labData,
        appointmentRevenueData,
        labRevenueData,
        totalAppointments: monthlyAppointments.reduce((sum, item) => sum + item.count, 0),
        totalLabTests: monthlyLabTests.reduce((sum, item) => sum + item.count, 0),
        totalRevenue: monthlyAppointments.reduce((sum, item) => sum + item.revenue, 0) + 
                     monthlyLabTests.reduce((sum, item) => sum + item.revenue, 0)
      });

    } catch (error) {
      console.error('Get monthly stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = adminController;