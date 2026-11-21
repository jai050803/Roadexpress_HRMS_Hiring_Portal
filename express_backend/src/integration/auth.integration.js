const jwt = require('jsonwebtoken');
const config = require('../config');

class AuthIntegration {
  constructor(options = {}) {
    this.customAuthMiddleware = options.customAuthMiddleware || null;
    this.getUserFromRequest = options.getUserFromRequest || null;
    this.jwtSecret = options.jwtSecret || config.jwt.secret;
  }

  extractUser(req) {
    if (typeof this.getUserFromRequest === 'function') {
      const customUser = this.getUserFromRequest(req);
      if (customUser) {
        return {
          id: customUser.id || customUser._id,
          email: customUser.email,
          role: customUser.role || 'recruiter',
          fullName: customUser.fullName || customUser.name || 'HR User',
          source: 'host_hrms'
        };
      }
    }

    if (req.user) {
      return {
        id: req.user.id || req.user._id || req.user.userId,
        email: req.user.email,
        role: req.user.role || 'recruiter',
        fullName: req.user.fullName || req.user.name || 'HR User',
        source: 'host_request'
      };
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        return {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'recruiter',
          fullName: decoded.fullName || 'HR User',
          source: 'standalone_jwt'
        };
      } catch (err) {
        return null;
      }
    }

    return null;
  }

  requireAuth(allowedRoles = []) {
    return (req, res, next) => {
      if (this.customAuthMiddleware) {
        return this.customAuthMiddleware(req, res, () => {
          const user = this.extractUser(req);
          if (!user) {
            return res.status(401).json({
              success: false,
              data: null,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
              }
            });
          }
          req.hiringUser = user;
          if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return res.status(403).json({
              success: false,
              data: null,
              error: {
                code: 'FORBIDDEN',
                message: 'Insufficient permissions for this resource'
              }
            });
          }
          next();
        });
      }

      const user = this.extractUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      req.hiringUser = user;

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          data: null,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions for this resource'
          }
        });
      }

      next();
    };
  }

  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: config.jwt.expiresIn
    });
  }
}

module.exports = AuthIntegration;
