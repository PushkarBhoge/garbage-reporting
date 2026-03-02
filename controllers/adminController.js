const GarbageReport = require('../models/GarbageReport');
const Blog = require('../models/Blog');
const Team = require('../models/Team');
const Newsletter = require('../models/Newsletter');
const Donation = require('../models/Donation');
const { uploadToCloudinary } = require('../config/cloudinary');

const adminController = {
  // Admin login page (redirect to unified auth)
  getLogin: (req, res) => {
    res.redirect('/auth/login');
  },

  // Admin login (redirect to unified auth)
  postLogin: (req, res) => {
    res.redirect('/auth/login');
  },

  // Admin logout
  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
  },

  // Admin dashboard
  getDashboard: async (req, res) => {
    try {
      const User = require('../models/User');
      const totalReports = await GarbageReport.countDocuments();
      const pendingReports = await GarbageReport.countDocuments({ status: 'Pending' });
      const assignedReports = await GarbageReport.countDocuments({ status: 'Assigned' });
      const cleanedReports = await GarbageReport.countDocuments({ status: 'Cleaned' });
      const totalTeams = await Team.countDocuments();
      const totalBlogs = await Blog.countDocuments();
      const totalUsers = await User.countDocuments();
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
        stats: { totalReports, pendingReports, assignedReports, cleanedReports, totalTeams, totalBlogs, totalUsers, totalSubscribers, totalDonations, donationCount },
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

  // Users management (renamed from subscribers)
  getSubscribers: async (req, res) => {
    try {
      const User = require('../models/User');
      const users = await User.find().sort({ createdAt: -1 });
      const Newsletter = require('../models/Newsletter');
      
      // Get subscription status for each user
      const usersWithSubscription = await Promise.all(users.map(async (user) => {
        const subscription = user.subscriberEmail ? 
          await Newsletter.findOne({ email: user.subscriberEmail, status: 'active' }) : null;
        return {
          ...user.toObject(),
          isSubscribed: !!subscription
        };
      }));
      
      res.render('admin/subscribers', { 
        title: 'Manage Users', 
        users: usersWithSubscription,
        success: req.session.subscriberSuccess
      });
      delete req.session.subscriberSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Delete user
  deleteSubscriber: async (req, res) => {
    try {
      const { subscriberId } = req.params;
      const User = require('../models/User');
      await User.findByIdAndDelete(subscriberId);
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
  },

  // Download donation report
  downloadDonationReport: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates required' });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      
      const donations = await Donation.find({
        status: 'completed',
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: -1 });
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Donation Report');
      
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Donor Name', key: 'donorName', width: 25 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Currency', key: 'currency', width: 12 },
        { header: 'Amount (INR)', key: 'amountINR', width: 15 },
        { header: 'Message', key: 'message', width: 40 }
      ];
      
      donations.forEach(donation => {
        const rate = donation.currency === 'INR' ? 1 : donation.currency === 'USD' ? 83 : donation.currency === 'EUR' ? 90 : 12;
        const inrAmount = donation.amount * rate;
        
        worksheet.addRow({
          date: new Date(donation.createdAt).toLocaleDateString(),
          donorName: donation.donorName || 'Anonymous',
          amount: donation.amount.toFixed(2),
          currency: donation.currency,
          amountINR: Math.round(inrAmount),
          message: donation.message || '-'
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=donation-report-${startDate}-to-${endDate}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Generate failed' });
    }
  },

  // Download reports Excel
  downloadReportsExcel: async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates required' });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      
      const query = { createdAt: { $gte: start, $lte: end } };
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const reports = await GarbageReport.find(query).populate('assignedTeam').sort({ createdAt: -1 });
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reports');
      
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Reported By', key: 'reportedBy', width: 20 },
        { header: 'Location', key: 'location', width: 40 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Assigned Team', key: 'team', width: 20 },
        { header: 'Cleaned Date', key: 'cleanedDate', width: 15 }
      ];
      
      reports.forEach(report => {
        worksheet.addRow({
          date: new Date(report.createdAt).toLocaleDateString(),
          reportedBy: report.reportedBy || 'Anonymous',
          location: `${report.location.area}, ${report.location.landmark}, ${report.location.city} - ${report.location.pincode}`,
          description: report.description,
          status: report.status,
          team: report.assignedTeam ? report.assignedTeam.name : 'Not Assigned',
          cleanedDate: report.cleanedAt ? new Date(report.cleanedAt).toLocaleDateString() : '-'
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reports-${startDate}-to-${endDate}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Generate failed' });
    }
  }
};

module.exports = adminController;