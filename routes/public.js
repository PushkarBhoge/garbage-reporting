const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const publicController = require('../controllers/publicController');

// Public routes
router.get('/', publicController.getHome);
router.get('/report', publicController.getReportForm);
router.post('/report', upload.single('beforeImage'), publicController.submitReport);
router.get('/reports', publicController.getReports);
router.get('/donate', publicController.getDonate);

module.exports = router;