const GarbageReport = require('../models/GarbageReport');
const Blog = require('../models/Blog');
const Team = require('../models/Team');
const Newsletter = require('../models/Newsletter');
const Donation = require('../models/Donation');
const { uploadToCloudinary } = require('../config/cloudinary');

const adminController = {
  // Admin login page
  getLogin: (req, res) => {
    if (req.session.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { title: 'Admin Login', error: req.query.error });
  },

  // Admin login
  postLogin: (req, res) => {
    const { email, password } = req.body;
    
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/admin/login?error=1');
    }
  },

  // Admin logout
  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/');
  },

  // Admin dashboard
  getDashboard: async (req, res) => {
    try {
      const totalReports = await GarbageReport.countDocuments();
      const pendingReports = await GarbageReport.countDocuments({ status: 'Pending' });
      const assignedReports = await GarbageReport.countDocuments({ status: 'Assigned' });
      const cleanedReports = await GarbageReport.countDocuments({ status: 'Cleaned' });
      const totalTeams = await Team.countDocuments();
      const totalBlogs = await Blog.countDocuments();
      const totalSubscribers = await Newsletter.countDocuments({ status: 'active' });
      
      const donations = await Donation.find({ status: 'completed' });
      const totalDonations = donations.reduce((sum, d) => {
        const rate = d.currency === 'INR' ? 1 : d.currency === 'USD' ? 83 : d.currency === 'EUR' ? 90 : 12;
        return sum + (d.amount * rate);
      }, 0);
      const donationCount = donations.length;

      // Monthly reports data (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const reports = await GarbageReport.find({ createdAt: { $gte: sixMonthsAgo } });
      
      const monthlyData = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = 0;
      }
      
      reports.forEach(report => {
        const key = `${report.createdAt.getFullYear()}-${String(report.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key] !== undefined) monthlyData[key]++;
      });

      // Monthly donations data (last 6 months)
      const donationsData = await Donation.find({ 
        status: 'completed',
        createdAt: { $gte: sixMonthsAgo }
      });
      
      const monthlyDonations = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyDonations[key] = 0;
      }
      
      donationsData.forEach(donation => {
        const key = `${donation.createdAt.getFullYear()}-${String(donation.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyDonations[key] !== undefined) {
          const rate = donation.currency === 'INR' ? 1 : donation.currency === 'USD' ? 83 : donation.currency === 'EUR' ? 90 : 12;
          monthlyDonations[key] += (donation.amount * rate);
        }
      });

      // Team performance
      const teamPerformance = await GarbageReport.aggregate([
        { $match: { status: 'Cleaned', assignedTeam: { $ne: null } } },
        { $group: { _id: '$assignedTeam', count: { $sum: 1 } } },
        { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
        { $unwind: '$team' },
        { $project: { teamName: '$team.name', count: 1 } },
        { $sort: { count: -1 } }
      ]);

      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        stats: { totalReports, pendingReports, assignedReports, cleanedReports, totalTeams, totalBlogs, totalSubscribers, totalDonations, donationCount },
        chartData: {
          monthlyLabels: Object.keys(monthlyData),
          monthlyValues: Object.values(monthlyData),
          donationLabels: Object.keys(monthlyDonations),
          donationValues: Object.values(monthlyDonations).map(v => Math.round(v)),
          teamLabels: teamPerformance.map(t => t.teamName),
          teamValues: teamPerformance.map(t => t.count)
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Dashboard load failed' });
    }
  },

  // Admin reports management
  getReports: async (req, res) => {
    try {
      const reports = await GarbageReport.find().populate('assignedTeam').sort({ createdAt: -1 });
      const teams = await Team.find();
      res.render('admin/reports', { 
        title: 'Manage Reports', 
        reports, 
        teams,
        success: req.session.adminReportSuccess
      });
      delete req.session.adminReportSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Update report status
  updateReport: async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, assignedTeam, adminRemarks } = req.body;
      
      const updateData = { status, updatedAt: new Date() };
      if (assignedTeam) updateData.assignedTeam = assignedTeam;
      if (adminRemarks) updateData.adminRemarks = adminRemarks;

      // Handle after image upload for cleaned status
      if (status === 'Cleaned' && req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        updateData.afterImage = {
          url: result.secure_url,
          public_id: result.public_id
        };
        updateData.cleanedAt = new Date();
      }

      await GarbageReport.findByIdAndUpdate(reportId, updateData);
      req.session.adminReportSuccess = true;
      res.redirect('/admin/reports');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Update failed' });
    }
  },

  // Teams management
  getTeams: async (req, res) => {
    try {
      const teams = await Team.find();
      res.render('admin/teams', { 
        title: 'Manage Teams', 
        teams,
        success: req.session.teamSuccess
      });
      delete req.session.teamSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Add team
  addTeam: async (req, res) => {
    try {
      const { name } = req.body;
      const team = new Team({ name });
      await team.save();
      req.session.teamSuccess = true;
      res.redirect('/admin/teams');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Add failed' });
    }
  },

  // Update team
  updateTeam: async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name } = req.body;
      await Team.findByIdAndUpdate(teamId, { name });
      req.session.teamSuccess = true;
      res.redirect('/admin/teams');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Update failed' });
    }
  },

  // Delete team
  deleteTeam: async (req, res) => {
    try {
      const { teamId } = req.params;
      await Team.findByIdAndDelete(teamId);
      req.session.teamSuccess = true;
      res.redirect('/admin/teams');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Delete failed' });
    }
  },

  // Add worker to team
  addWorker: async (req, res) => {
    try {
      const { teamId } = req.params;
      const { workerName } = req.body;
      await Team.findByIdAndUpdate(teamId, {
        $push: { workers: { name: workerName } }
      });
      req.session.teamSuccess = true;
      res.redirect('/admin/teams');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Add failed' });
    }
  },

  // Remove worker from team
  removeWorker: async (req, res) => {
    try {
      const { teamId, workerId } = req.params;
      await Team.findByIdAndUpdate(teamId, {
        $pull: { workers: { _id: workerId } }
      });
      req.session.teamSuccess = true;
      res.redirect('/admin/teams');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Remove failed' });
    }
  },

  // Get reports page
  getReportsPage: async (req, res) => {
    try {
      res.render('admin/reports-download', { title: 'Download Reports' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Load failed' });
    }
  },

  // Download report
  downloadReport: async (req, res) => {
    try {
      const { period, year, month, day } = req.query;
      let startDate, endDate;
      
      if (period === 'day' && year && month && day) {
        startDate = new Date(year, month - 1, day);
        endDate = new Date(year, month - 1, day, 23, 59, 59);
      } else if (period === 'month' && year && month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
      } else if (period === 'year' && year) {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59);
      } else {
        return res.status(400).json({ error: 'Invalid params' });
      }
      
      const reports = await GarbageReport.find({
        status: 'Cleaned',
        cleanedAt: { $gte: startDate, $lte: endDate }
      }).populate('assignedTeam');
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Cleaning Report');
      
      worksheet.columns = [
        { header: 'Date Cleaned', key: 'cleanedAt', width: 15 },
        { header: 'Location', key: 'location', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Team Name', key: 'teamName', width: 20 },
        { header: 'Team Members', key: 'teamMembers', width: 50 },
        { header: 'Admin Remarks', key: 'adminRemarks', width: 30 }
      ];
      
      reports.forEach(report => {
        const teamMembers = report.assignedTeam ? 
          report.assignedTeam.workers.map(w => w.name).join(', ') : 'N/A';
        
        worksheet.addRow({
          cleanedAt: report.cleanedAt ? new Date(report.cleanedAt).toLocaleDateString() : 'N/A',
          location: `${report.location.area}, ${report.location.landmark}, ${report.location.city} - ${report.location.pincode}`,
          description: report.description,
          teamName: report.assignedTeam ? report.assignedTeam.name : 'N/A',
          teamMembers: teamMembers,
          adminRemarks: report.adminRemarks || 'N/A'
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cleaning-report-${period}-${year}${month ? '-' + month : ''}${day ? '-' + day : ''}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Generate failed' });
    }
  },

  // Blogs management
  getBlogs: async (req, res) => {
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      res.render('admin/blogs', { 
        title: 'Manage Blogs', 
        blogs,
        success: req.session.adminBlogSuccess
      });
      delete req.session.adminBlogSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Delete blog
  deleteBlog: async (req, res) => {
    try {
      const { blogId } = req.params;
      await Blog.findByIdAndDelete(blogId);
      req.session.adminBlogSuccess = true;
      res.redirect('/admin/blogs');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Delete failed' });
    }
  },

  // Newsletter subscribers management
  getSubscribers: async (req, res) => {
    try {
      const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
      res.render('admin/subscribers', { 
        title: 'Newsletter Subscribers', 
        subscribers,
        success: req.session.subscriberSuccess
      });
      delete req.session.subscriberSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Delete subscriber
  deleteSubscriber: async (req, res) => {
    try {
      const { subscriberId } = req.params;
      await Newsletter.findByIdAndDelete(subscriberId);
      req.session.subscriberSuccess = true;
      res.redirect('/admin/subscribers');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Delete failed' });
    }
  },

  // Donations management
  getDonations: async (req, res) => {
    try {
      const donations = await Donation.find().sort({ createdAt: -1 });
      res.render('admin/donations', { 
        title: 'Donations', 
        donations,
        success: req.session.donationSuccess
      });
      delete req.session.donationSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Delete donation
  deleteDonation: async (req, res) => {
    try {
      const { donationId } = req.params;
      await Donation.findByIdAndDelete(donationId);
      req.session.donationSuccess = true;
      res.redirect('/admin/donations');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Delete failed' });
    }
  }
};

module.exports = adminController;