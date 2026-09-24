import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        status: false,
        message: 'Access token is required. Please login.'
      });
    }

    const secret = process.env.JWT_SECRET || 'c2hpcGZhc3Qtc2VjcmV0LWtleS1zaGlwZmFzdC1rZXk=';
    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: false,
          message: 'Access token expired. Please refresh your token.'
        });
      }
      return res.status(401).json({
        status: false,
        message: 'Invalid access token.'
      });
    }

    const emailOrId = decoded.sub || decoded.email || decoded.userId;
    const user = await User.findOne({
      $or: [{ email: String(emailOrId).toLowerCase() }, { userId: emailOrId }]
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'User account not found.'
      });
    }

    req.user = user;
    req.userId = user.userId;
    req.userEmail = user.email;
    req.userRole = user.role;

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Authentication error: ' + error.message
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'c2hpcGZhc3Qtc2VjcmV0LWtleS1zaGlwZmFzdC1rZXk=';
    const decoded = jwt.verify(token, secret);

    const emailOrId = decoded.sub || decoded.email || decoded.userId;
    const user = await User.findOne({
      $or: [{ email: String(emailOrId).toLowerCase() }, { userId: emailOrId }]
    });

    if (user) {
      req.user = user;
      req.userId = user.userId;
      req.userEmail = user.email;
      req.userRole = user.role;
    }
  } catch {
    // Ignore invalid/expired token in optionalAuth
  }
  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Unauthorized. Authentication required.'
      });
    }

    const currentRole = String(req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (normalizedAllowed.includes(currentRole) || currentRole === 'ADMIN') {
      return next();
    }

    return res.status(403).json({
      status: false,
      message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
    });
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireAgent = requireRole('AGENT', 'DRIVER', 'OPERATIONS');
