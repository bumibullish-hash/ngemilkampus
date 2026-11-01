const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function readUser(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(payload.id);
  } catch (error) {
    return null;
  }
}

async function optionalAuth(req, res, next) {
  req.user = await readUser(req);
  next();
}

async function protect(req, res, next) {
  const user = await readUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
  }
  req.user = user;
  next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke fitur ini' });
    }
    next();
  };
}

function pageGuard(...roles) {
  return async (req, res, next) => {
    const user = await readUser(req);
    if (!user) {
      return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    }
    if (!roles.includes(user.role)) {
      return res.redirect(user.role === 'admin' ? '/admin' : '/');
    }
    req.user = user;
    next();
  };
}

module.exports = { optionalAuth, protect, allowRoles, pageGuard };
