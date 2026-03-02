const mongoose = require('mongoose');

const garbageReportSchema = new mongoose.Schema({
  beforeImage: {
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  },
  afterImage: {
    url: String,
    public_id: String
  },
  location: {
    area: { type: String, required: true },
    landmark: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  description: { type: String, required: true },
  reportedBy: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Cleaned'],
    default: 'Pending'
  },
  assignedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  adminRemarks: String,
  cleanedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GarbageReport', garbageReportSchema);