const GarbageReport = require('../models/GarbageReport');
const { uploadToCloudinary } = require('../config/cloudinary');
const { translateText } = require('../middleware/language');

const publicController = {
  // Home page
  getHome: (req, res) => {
    res.render('public/home', { title: 'Garbage Reporting System' });
  },

  // Report garbage form
  getReportForm: (req, res) => {
    res.render('public/report', { title: 'Report Garbage' });
  },

  // Submit garbage report
  submitReport: async (req, res) => {
    try {
      const { area, landmark, city, pincode, description } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const result = await uploadToCloudinary(req.file.buffer);
      
      const report = new GarbageReport({
        beforeImage: {
          url: result.secure_url,
          public_id: result.public_id
        },
        location: { area, landmark, city, pincode },
        description
      });

      await report.save();
      res.redirect('/reports?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  },

  // View all reports (public)
  getReports: async (req, res) => {
    try {
      const reports = await GarbageReport.find().sort({ createdAt: -1 });
      const language = req.session.language || 'en';
      
      if (language === 'mr') {
        for (let report of reports) {
          report.location.area = await translateText(report.location.area, 'mr');
          report.location.landmark = await translateText(report.location.landmark, 'mr');
          report.location.city = await translateText(report.location.city, 'mr');
          report.description = await translateText(report.description, 'mr');
        }
      }
      
      res.render('public/reports', { 
        title: 'View Reports', 
        reports,
        success: req.query.success 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  },

  // Donation page
  getDonate: (req, res) => {
    res.render('public/donate', { title: 'Donate' });
  },

  // Our Work page
  getOurWork: (req, res) => {
    res.render('public/our-work', { title: 'Our Work' });
  }
};

module.exports = publicController;