const Newsletter = require('../models/Newsletter');
const { sendRenewalEmail } = require('../config/email');

const checkAndSendRenewalEmails = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const subscribers = await Newsletter.find({
      confirmed: true,
      status: 'active',
      $or: [
        { lastRenewalEmailSent: { $exists: false } },
        { lastRenewalEmailSent: { $lte: thirtyDaysAgo } }
      ]
    });

    for (const subscriber of subscribers) {
      await sendRenewalEmail(subscriber.email, subscriber.token);
      subscriber.lastRenewalEmailSent = new Date();
      await subscriber.save();
      console.log(`Renewal email sent to: ${subscriber.email}`);
    }
  } catch (error) {
    console.error('Error sending renewal emails:', error);
  }
};

const startRenewalScheduler = () => {
  checkAndSendRenewalEmails();
  setInterval(checkAndSendRenewalEmails, 24 * 60 * 60 * 1000);
};

module.exports = { startRenewalScheduler };
