const GarbageReport = require('../models/GarbageReport');
const Team = require('../models/Team');
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

      res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        stats: { totalReports, pendingReports, assignedReports, cleanedReports, totalTeams }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load dashboard' });
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
        success: req.query.success 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch reports' });
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
      res.redirect('/admin/reports?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  },

  // Teams management
  getTeams: async (req, res) => {
    try {
      const teams = await Team.find();
      res.render('admin/teams', { 
        title: 'Manage Teams', 
        teams,
        success: req.query.success 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  // Add team
  addTeam: async (req, res) => {
    try {
      const { name } = req.body;
      const team = new Team({ name });
      await team.save();
      res.redirect('/admin/teams?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add team' });
    }
  },

  // Update team
  updateTeam: async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name } = req.body;
      await Team.findByIdAndUpdate(teamId, { name });
      res.redirect('/admin/teams?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  },

  // Delete team
  deleteTeam: async (req, res) => {
    try {
      const { teamId } = req.params;
      await Team.findByIdAndDelete(teamId);
      res.redirect('/admin/teams?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete team' });
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
      res.redirect('/admin/teams?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to add worker' });
    }
  },

  // Remove worker from team
  removeWorker: async (req, res) => {
    try {
      const { teamId, workerId } = req.params;
      await Team.findByIdAndUpdate(teamId, {
        $pull: { workers: { _id: workerId } }
      });
      res.redirect('/admin/teams?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to remove worker' });
    }
  },

  // Get reports page
  getReportsPage: async (req, res) => {
    try {
      res.render('admin/reports-download', { title: 'Download Reports' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to load reports page' });
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
        return res.status(400).json({ error: 'Invalid parameters' });
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
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
};

module.exports = adminController;