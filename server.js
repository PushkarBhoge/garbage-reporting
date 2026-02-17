const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { languageMiddleware } = require('./middleware/language');
const { getTranslation } = require('./utils/translations');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Language middleware
app.use(languageMiddleware);
app.use((req, res, next) => {
  res.locals.t = (text) => getTranslation(text, req.session.language);
  next();
});

// Language switch route
app.post('/set-language', (req, res) => {
  const { language } = req.body;
  if (language === 'en' || language === 'mr') {
    req.session.language = language;
  }
  res.json({ success: true });
});

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});