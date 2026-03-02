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
router.post('/create-checkout-session', publicController.createCheckoutSession);
router.get('/verify-payment', publicController.verifyPayment);
router.get('/our-work', publicController.getOurWork);
router.get('/create-blog', publicController.getCreateBlog);
router.post('/create-blog', upload.single('image'), publicController.submitBlog);
router.get('/blogs', publicController.getBlogs);
router.post('/subscribe', publicController.subscribeNewsletter);
router.post('/subscribe-from-profile', publicController.subscribeFromProfile);
router.get('/confirm-subscription', publicController.confirmSubscription);
router.get('/renew-subscription', publicController.renewSubscription);
router.get('/unsubscribe', publicController.unsubscribe);
router.post('/unsubscribe-by-email', publicController.unsubscribeByEmail);

module.exports = router;