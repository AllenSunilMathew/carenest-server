const LabTest = require('../models/LabTest');
const User = require('../models/User');

const labController = {
  // Book lab test
  bookLabTest: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { 
        testName, 
        testCategory, 
        testDate, 
        timeSlot, 
        fastingRequired, 
        instructions, 
        doctorReferral, 
        amount 
      } = req.body;

      // Create lab test
      const labTest = new LabTest({
        patientId: userId,
        testName,
        testCategory,
        testDate: new Date(testDate),
        timeSlot,
        fastingRequired,
        instructions,
        doctorReferral,
        amount
      });

      await labTest.save();

      res.status(201).json({
        success: true,
        message: 'Lab test booked successfully',
        labTest: {
          id: labTest._id,
          bookingId: labTest.bookingId,
          testName: labTest.testName,
          testCategory: labTest.testCategory,
          date: labTest.testDate,
          time: labTest.timeSlot,
          fastingRequired: labTest.fastingRequired,
          amount: labTest.amount,
          status: labTest.status,
          reportTime: labTest.reportTime
        }
      });

    } catch (error) {
      console.error('Book lab test error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while booking lab test'
      });
    }
  },

  // Get user lab tests
  getUserLabTests: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const labTests = await LabTest.find({ patientId: userId })
        .sort({ testDate: -1 });

      res.json({
        success: true,
        labTests: labTests.map(test => ({
          id: test._id,
          bookingId: test.bookingId,
          testName: test.testName,
          testCategory: test.testCategory,
          date: test.testDate,
          time: test.timeSlot,
          fastingRequired: test.fastingRequired,
          instructions: test.instructions,
          doctorReferral: test.doctorReferral,
          status: test.status,
          reportTime: test.reportTime,
          amount: test.amount,
          reportAvailable: test.reportAvailable,
          reportUrl: test.reportUrl,
          createdAt: test.createdAt
        }))
      });

    } catch (error) {
      console.error('Get lab tests error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get lab test by ID
  getLabTestById: async (req, res) => {
    try {
      const labTest = await LabTest.findById(req.params.id)
        .populate('patientId', 'username email phone');

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      // Check if user is authorized
      if (req.user.role !== 'admin' && labTest.patientId._id.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }

      res.json({
        success: true,
        labTest
      });

    } catch (error) {
      console.error('Get lab test error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Update lab test status
  updateLabTestStatus: async (req, res) => {
    try {
      const { status, reportUrl, reportAvailable } = req.body;
      
      const labTest = await LabTest.findById(req.params.id);

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      // Update fields
      if (status) labTest.status = status;
      if (reportUrl) labTest.reportUrl = reportUrl;
      if (reportAvailable !== undefined) labTest.reportAvailable = reportAvailable;
      
      labTest.updatedAt = new Date();
      
      await labTest.save();

      res.json({
        success: true,
        message: 'Lab test updated',
        labTest
      });

    } catch (error) {
      console.error('Update lab test error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Get all lab tests (admin only)
  getAllLabTests: async (req, res) => {
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
        filter.testDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const labTests = await LabTest.find(filter)
        .populate('patientId', 'username email phone')
        .sort({ testDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await LabTest.countDocuments(filter);

      res.json({
        success: true,
        labTests,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      });

    } catch (error) {
      console.error('Get all lab tests error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  },

  // Upload report
  uploadReport: async (req, res) => {
    try {
      const { reportUrl } = req.body;
      
      const labTest = await LabTest.findById(req.params.id);

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      labTest.reportUrl = reportUrl;
      labTest.reportAvailable = true;
      labTest.status = 'completed';
      labTest.updatedAt = new Date();
      
      await labTest.save();

      res.json({
        success: true,
        message: 'Report uploaded successfully',
        labTest
      });

    } catch (error) {
      console.error('Upload report error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
};

module.exports = labController;