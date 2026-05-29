const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─────────────────────────────────────────────
// Helper: Extract & verify JWT from request
// ─────────────────────────────────────────────
const extractToken = (req) => {
  // 1. Authorization header: "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  // 2. Cookie fallback (if cookie-parser is used)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

// ─────────────────────────────────────────────
// 1. PROTECT — Verify JWT & attach user to req
//    Usage: router.get('/route', protect, handler)
// ─────────────────────────────────────────────
const protect = async (req, res, next) => {
  const token = extractToken(req);
  console.log('[Auth Middleware] Request path:', req.path);
  console.log('[Auth Middleware] Extracted token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  try {
    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth Middleware] Token decoded successfully, userId:', decoded.id);

    // Fetch fresh user from DB (ensures user still exists & is active)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User account no longer exists.',
      });
    }

    req.user = user; // attach full user object to request
    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification error:', error.name, error.message);
    // Provide specific error feedback
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Access denied.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token validation failed.',
    });
  }
};

// ─────────────────────────────────────────────
// 2. AUTHORIZE — Role-based access control
//    Runs AFTER protect (req.user must exist)
//    Usage: router.get('/admin', protect, authorize('admin'), handler)
//    Usage: router.get('/staff', protect, authorize('admin', 'doctor'), handler)
// ─────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in first.',
      });
    }

    const userRole = req.user.role || 'patient'; // default role fallback

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${userRole}' is not permitted to perform this action.`,
      });
    }

    next();
  };
};

// ─────────────────────────────────────────────
// 3. OPTIONAL AUTH — Attach user if token exists,
//    but don't block if no token is provided.
//    Useful for public routes that show extra info
//    when a user is logged in.
//    Usage: router.get('/public', optionalAuth, handler)
// ─────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null; // explicitly null so handlers can check
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
  } catch (error) {
    // Invalid/expired token — just proceed without a user
    req.user = null;
  }

  next();
};

// ─────────────────────────────────────────────
// 4. OWNERSHIP CHECK — Ensure the logged-in user
//    owns the resource (matches a userId field).
//    Runs AFTER protect.
//
//    Usage: router.put('/:id', protect, checkOwnership('userId'), handler)
//    The `ownerField` is the field in req.body / params
//    that holds the owner's user ID.
// ─────────────────────────────────────────────
const checkOwnership = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in first.',
      });
    }

    // Allow admins/doctors to bypass ownership check
    const privilegedRoles = ['admin', 'doctor'];
    if (privilegedRoles.includes(req.user.role)) {
      return next();
    }

    // Compare resource owner with current user
    const resourceOwnerId =
      req.body[ownerField] ||
      req.params[ownerField] ||
      req.query[ownerField];

    if (!resourceOwnerId) {
      return res.status(400).json({
        success: false,
        message: `Ownership field '${ownerField}' not found in request.`,
      });
    }

    if (resourceOwnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this resource.',
      });
    }

    next();
  };
};

// ─────────────────────────────────────────────
// 5. RATE LIMIT GUARD — Simple in-memory request
//    throttle per IP to prevent brute-force.
//    Usage: router.post('/login', rateLimitGuard(5, 60000), handler)
//    (max 5 requests per 60 seconds per IP)
// ─────────────────────────────────────────────
const requestCounts = new Map(); // { ip: { count, resetAt } }

const rateLimitGuard = (maxRequests = 10, windowMs = 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
      // Fresh window
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${retryAfterSec} seconds.`,
      });
    }

    record.count += 1;
    next();
  };
};

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────
module.exports = {
  protect,
  authorize,
  optionalAuth,
  checkOwnership,
  rateLimitGuard,
};
