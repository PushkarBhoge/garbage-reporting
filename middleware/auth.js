const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

const isUser = (req, res, next) => {
  if (req.session.userId && req.session.role === 'user') {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

const isAdmin = (req, res, next) => {
  if (req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Legacy support
const requireAdmin = isAdmin;

module.exports = { isAuthenticated, isUser, isAdmin, requireAdmin };