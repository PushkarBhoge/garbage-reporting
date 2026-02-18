const GarbageReport = require('../models/GarbageReport');
const Blog = require('../models/Blog');
const Newsletter = require('../models/Newsletter');
const { uploadToCloudinary } = require('../config/cloudinary');
const { translateText } = require('../middleware/language');
const { sendConfirmationEmail, sendWelcomeEmail } = require('../config/email');
const crypto = require('crypto');

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
  },

  // Create blog form
  getCreateBlog: (req, res) => {
    res.render('public/create-blog', { title: 'Create Blog' });
  },

  // Submit blog
  submitBlog: async (req, res) => {
    try {
      const { title, author, description } = req.body;
      
      const blogData = { title, author, description };
      
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        blogData.image = {
          url: result.secure_url,
          public_id: result.public_id
        };
      }

      const blog = new Blog(blogData);
      await blog.save();
      res.redirect('/blogs?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create blog' });
    }
  },

  // View all blogs
  getBlogs: async (req, res) => {
    try {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      const language = req.session.language || 'en';
      
      if (language === 'mr') {
        for (let blog of blogs) {
          blog.title = await translateText(blog.title, 'mr');
          blog.author = await translateText(blog.author, 'mr');
          blog.description = await translateText(blog.description, 'mr');
        }
      }
      
      res.render('public/blogs', { 
        title: 'Blogs', 
        blogs,
        success: req.query.success 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch blogs' });
    }
  },

  // Subscribe to newsletter
  subscribeNewsletter: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      const existingSubscriber = await Newsletter.findOne({ email });
      if (existingSubscriber) {
        if (existingSubscriber.confirmed) {
          return res.status(400).json({ error: 'Email already subscribed' });
        }
        await sendConfirmationEmail(email, existingSubscriber.token);
        return res.json({ success: true, message: 'Confirmation email sent! Please check your inbox.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const subscriber = new Newsletter({ email, token });
      await subscriber.save();
      
      await sendConfirmationEmail(email, token);
      
      res.json({ success: true, message: 'Confirmation email sent! Please check your inbox.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  },

  confirmSubscription: async (req, res) => {
    try {
      const { token } = req.query;
      
      const subscriber = await Newsletter.findOne({ token });
      if (!subscriber) {
        return res.redirect('/?error=invalid');
      }

      if (subscriber.confirmed) {
        return res.redirect('/?already=confirmed');
      }

      subscriber.confirmed = true;
      subscriber.status = 'active';
      await subscriber.save();
      
      req.session.subscriberEmail = subscriber.email;
      
      await sendWelcomeEmail(subscriber.email, subscriber.token);
      
      res.redirect('/?subscribed=1');
    } catch (error) {
      console.error(error);
      res.redirect('/?error=failed');
    }
  },

  renewSubscription: async (req, res) => {
    try {
      const { token } = req.query;
      
      const subscriber = await Newsletter.findOne({ token });
      if (!subscriber) {
        return res.redirect('/?error=invalid');
      }

      subscriber.lastRenewalEmailSent = null;
      await subscriber.save();
      
      res.redirect('/?renewed=1');
    } catch (error) {
      console.error(error);
      res.redirect('/?error=failed');
    }
  },

  unsubscribe: async (req, res) => {
    try {
      const { token } = req.query;
      
      const subscriber = await Newsletter.findOne({ token });
      if (!subscriber) {
        return res.redirect('/?error=invalid');
      }

      subscriber.status = 'unsubscribed';
      subscriber.confirmed = false;
      await subscriber.save();
      
      req.session.subscriberEmail = null;
      
      res.redirect('/?unsubscribed=1');
    } catch (error) {
      console.error(error);
      res.redirect('/?error=failed');
    }
  },

  unsubscribeByEmail: async (req, res) => {
    try {
      const { email } = req.body;
      
      const subscriber = await Newsletter.findOne({ email, status: 'active' });
      if (!subscriber) {
        return res.status(404).json({ error: 'Subscriber not found' });
      }

      subscriber.status = 'unsubscribed';
      subscriber.confirmed = false;
      await subscriber.save();
      
      req.session.subscriberEmail = null;
      
      res.json({ success: true, message: 'Successfully unsubscribed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  }
};

module.exports = publicController;