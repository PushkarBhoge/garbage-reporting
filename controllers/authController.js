const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.getAuth = (req, res) => {
  if (req.session.userId) {
    return res.redirect(req.session.role === 'admin' ? '/admin/dashboard' : '/');
  }
  res.render('auth/auth', { error: null, success: null });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (password.length < 6) {
      return res.render('auth/auth', { error: 'Password must be at least 6 characters', success: null });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/auth', { error: 'Email already registered', success: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    req.session.userId = user._id;
    req.session.role = 'user';
    req.session.name = user.name;

    res.redirect('/');
  } catch (error) {
    res.render('auth/auth', { error: 'Signup failed', success: null });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if it's the default admin from .env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      req.session.userId = 'admin';
      req.session.role = 'admin';
      req.session.name = 'Admin';
      return res.redirect('/admin/dashboard');
    }

    // Only allow user login from database
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/auth', { error: 'Invalid credentials', success: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('auth/auth', { error: 'Invalid credentials', success: null });
    }

    req.session.userId = user._id;
    req.session.role = 'user';
    req.session.name = user.name;
    req.session.subscriberEmail = user.subscriberEmail || null;

    res.redirect('/');
  } catch (error) {
    res.render('auth/auth', { error: 'Login failed', success: null });
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/auth/login');
    }
    
    const Donation = require('../models/Donation');
    const donations = await Donation.find({ userId: req.session.userId, status: 'completed' }).sort({ createdAt: -1 });
    const totalDonated = donations.reduce((sum, d) => {
      const inrAmount = d.currency === 'INR' ? d.amount : d.amount * 83;
      return sum + inrAmount;
    }, 0);
    
    const success = req.session.profileSuccess;
    delete req.session.profileSuccess;
    res.render('auth/profile', { title: 'My Profile', user, donations, totalDonated, success, error: null });
  } catch (error) {
    res.redirect('/');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, city, state, pincode, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.redirect('/auth/login');
    }

    // Validate phone number
    if (phone && phone.length !== 10) {
      return res.render('auth/profile', { title: 'My Profile', user, success: null, error: 'Phone number must be exactly 10 digits' });
    }

    // Update basic info
    user.name = name;
    user.phone = phone;
    user.address = address;
    user.city = city;
    user.state = state;
    user.pincode = pincode;

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.render('auth/profile', { title: 'My Profile', user, success: null, error: 'New password must be at least 6 characters' });
      }
      if (!currentPassword) {
        return res.render('auth/profile', { title: 'My Profile', user, success: null, error: 'Current password required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.render('auth/profile', { title: 'My Profile', user, success: null, error: 'Current password incorrect' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    req.session.name = user.name;
    req.session.profileSuccess = true;
    res.redirect('/auth/profile');
  } catch (error) {
    res.redirect('/auth/profile');
  }
};
