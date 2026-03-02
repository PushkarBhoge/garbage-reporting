const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Admin authentication routes
router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/logout', adminController.logout);

// Protected admin routes
router.get('/dashboard', requireAdmin, adminController.getDashboard);
router.get('/reports', requireAdmin, adminController.getReports);
router.post('/reports/:reportId', requireAdmin, upload.single('afterImage'), adminController.updateReport);

// Team management routes
router.get('/teams', requireAdmin, adminController.getTeams);
router.post('/teams', requireAdmin, adminController.addTeam);
router.put('/teams/:teamId', requireAdmin, adminController.updateTeam);
router.delete('/teams/:teamId', requireAdmin, adminController.deleteTeam);
router.post('/teams/:teamId/workers', requireAdmin, adminController.addWorker);
router.delete('/teams/:teamId/workers/:workerId', requireAdmin, adminController.removeWorker);

// Report download routes
router.get('/reports/download', requireAdmin, adminController.downloadReportsExcel);

// Blog management routes
router.get('/blogs', requireAdmin, adminController.getBlogs);
router.delete('/blogs/:blogId', requireAdmin, adminController.deleteBlog);

// Newsletter subscribers management routes
router.get('/subscribers', requireAdmin, adminController.getSubscribers);
router.delete('/subscribers/:subscriberId', requireAdmin, adminController.deleteSubscriber);

// Donations management routes
router.get('/donations', requireAdmin, adminController.getDonations);
router.delete('/donations/:donationId', requireAdmin, adminController.deleteDonation);
router.get('/donations/download', requireAdmin, adminController.downloadDonationReport);

module.exports = router;