const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Patient ID is required']
  },
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true
  },
  testCategory: {
    type: String,
    required: [true, 'Test category is required'],
    trim: true
  },
  testDate: {
    type: Date,
    required: [true, 'Test date is required']
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required'],
    trim: true
  },
  fastingRequired: {
    type: Boolean,
    default: false
  },
  instructions: {
    type: String,
    trim: true
  },
  doctorReferral: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'sample-collected', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  reportTime: {
    type: String,
    default: '24 hours',
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  reportUrl: {
    type: String,
    default: '',
    trim: true
  },
  reportAvailable: {
    type: Boolean,
    default: false
  },
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate booking ID before saving
labTestSchema.pre('save', function(next) {
  if (!this.bookingId) {
    // Generate LAB + timestamp + random number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingId = `LAB${timestamp}${random}`;
  }
  next();
});

// Update timestamp on save
labTestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
labTestSchema.index({ patientId: 1, testDate: 1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ bookingId: 1 });

const LabTest = mongoose.model('LabTest', labTestSchema);

module.exports = LabTest;