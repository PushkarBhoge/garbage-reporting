const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

module.exports = { requireAdmin };