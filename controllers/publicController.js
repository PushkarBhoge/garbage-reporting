const GarbageReport = require('../models/GarbageReport');
const Blog = require('../models/Blog');
const Newsletter = require('../models/Newsletter');
const Donation = require('../models/Donation');
const { uploadToCloudinary } = require('../config/cloudinary');
const { translateText } = require('../middleware/language');
const { sendConfirmationEmail, sendWelcomeEmail } = require('../config/email');
const crypto = require('crypto');

const publicController = {
  // Home page
  getHome: (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/auth/login');
    }
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
        return res.status(400).json({ error: 'Image required' });
      }

      const result = await uploadToCloudinary(req.file.buffer);
      
      const report = new GarbageReport({
        beforeImage: {
          url: result.secure_url,
          public_id: result.public_id
        },
        location: { area, landmark, city, pincode },
        description,
        reportedBy: req.session.name || 'Anonymous'
      });

      await report.save();
      req.session.reportSuccess = true;
      res.redirect('/reports');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Submit failed' });
    }
  },

  // View all reports (public)
  getReports: async (req, res) => {
    try {
      const filter = req.query.filter || 'all';
      const userName = req.session.name;
      
      let query = {};
      if (filter === 'mine' && userName) {
        query = { reportedBy: userName };
      }
      
      const reports = await GarbageReport.find(query).sort({ createdAt: -1 });
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
        filter,
        success: req.session.reportSuccess
      });
      delete req.session.reportSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Donation page
  getDonate: (req, res) => {
    res.render('public/donate', { 
      title: 'Donate',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
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
      const { title, description } = req.body;
      
      const blogData = { 
        title, 
        author: req.session.name || 'Anonymous',
        description 
      };
      
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        blogData.image = {
          url: result.secure_url,
          public_id: result.public_id
        };
      }

      const blog = new Blog(blogData);
      await blog.save();
      req.session.blogSuccess = true;
      res.redirect('/blogs');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Create failed' });
    }
  },

  // View all blogs
  getBlogs: async (req, res) => {
    try {
      const filter = req.query.filter || 'all';
      const userName = req.session.name;
      
      let query = {};
      if (filter === 'mine' && userName) {
        query = { author: userName };
      }
      
      const blogs = await Blog.find(query).sort({ createdAt: -1 });
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
        filter,
        success: req.session.blogSuccess
      });
      delete req.session.blogSuccess;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Fetch failed' });
    }
  },

  // Subscribe to newsletter
  subscribeNewsletter: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }
      
      const existingSubscriber = await Newsletter.findOne({ email });
      if (existingSubscriber) {
        if (existingSubscriber.confirmed) {
          return res.status(400).json({ error: 'Already subscribed' });
        }
        await sendConfirmationEmail(email, existingSubscriber.token);
        return res.json({ success: true, message: 'Check your email!' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const subscriber = new Newsletter({ email, token });
      await subscriber.save();
      
      await sendConfirmationEmail(email, token);
      
      res.json({ success: true, message: 'Check your email!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Subscribe failed' });
    }
  },

  // Subscribe from profile (auto-fetch email)
  subscribeFromProfile: async (req, res) => {
    try {
      if (!req.session.userId || req.session.userId === 'admin') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const User = require('../models/User');
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const email = user.email;
      const existingSubscriber = await Newsletter.findOne({ email });
      
      if (existingSubscriber) {
        if (existingSubscriber.confirmed) {
          return res.status(400).json({ error: 'Already subscribed' });
        }
        await sendConfirmationEmail(email, existingSubscriber.token);
        return res.json({ success: true, message: 'Confirmation email sent!' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const subscriber = new Newsletter({ email, token });
      await subscriber.save();
      
      await sendConfirmationEmail(email, token);
      
      res.json({ success: true, message: 'Confirmation email sent!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Subscribe failed' });
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
      
      // Update User model if logged in
      if (req.session.userId && req.session.userId !== 'admin') {
        await require('../models/User').findByIdAndUpdate(req.session.userId, { subscriberEmail: subscriber.email });
      }
      
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
      
      // Update User model if logged in
      if (req.session.userId && req.session.userId !== 'admin') {
        await require('../models/User').findByIdAndUpdate(req.session.userId, { subscriberEmail: null });
      }
      
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
        return res.status(404).json({ error: 'Not found' });
      }

      subscriber.status = 'unsubscribed';
      subscriber.confirmed = false;
      await subscriber.save();
      
      req.session.subscriberEmail = null;
      
      // Update User model if logged in
      if (req.session.userId && req.session.userId !== 'admin') {
        await require('../models/User').findByIdAndUpdate(req.session.userId, { subscriberEmail: null });
      }
      
      res.json({ success: true, message: 'Unsubscribed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unsubscribe failed' });
    }
  },

  // Create Stripe checkout session
  createCheckoutSession: async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_')) {
        return res.status(500).json({ error: 'Stripe not configured. Please add valid API keys.' });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const { amount, currency, message } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Donation to Swachh Sena',
              description: 'Support our clean city initiative'
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/donate?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/donate?canceled=true`
      });

      // Save donation record
      const donation = new Donation({
        amount,
        currency,
        donorName: req.session.name || 'Anonymous',
        userId: req.session.userId,
        message,
        stripeSessionId: session.id,
        status: 'pending'
      });
      await donation.save();

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error('Stripe Error:', error.message);
      res.status(500).json({ error: error.message || 'Payment failed' });
    }
  },

  // Verify payment success
  verifyPayment: async (req, res) => {
    try {
      const { session_id } = req.query;
      if (!session_id) return res.json({ success: false });

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === 'paid') {
        await Donation.findOneAndUpdate(
          { stripeSessionId: session_id },
          { status: 'completed' }
        );
        return res.json({ success: true });
      }

      res.json({ success: false });
    } catch (error) {
      console.error('Verify Error:', error);
      res.json({ success: false });
    }
  }
};

module.exports = publicController;