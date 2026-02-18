const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  confirmed: { type: Boolean, default: false },
  token: { type: String, required: true },
  subscribedAt: { type: Date, default: Date.now },
  lastRenewalEmailSent: { type: Date },
  status: { type: String, enum: ['pending', 'active', 'unsubscribed'], default: 'pending' }
});

module.exports = mongoose.model('Newsletter', newsletterSchema);
