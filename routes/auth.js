const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getAuth);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

const { isAuthenticated, isUser } = require('../middleware/auth');
router.get('/profile', isAuthenticated, isUser, authController.getProfile);
router.post('/profile', isAuthenticated, isUser, authController.updateProfile);

module.exports = router;
