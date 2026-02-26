const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const config = require('../config');

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  display_name: Joi.string().max(50).optional()
});

const loginSchema = Joi.object({
  username_or_email: Joi.string().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required()
});

const AuthController = {
  // Register new user
  async register(req, res) {
    try {
      // Validate input
      const { error } = registerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { username, email, password, display_name } = req.body;

      // Check if username exists
      if (await User.usernameExists(username)) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Username already exists'
          }
        });
      }

      // Check if email exists
      if (await User.emailExists(email)) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Email already exists'
          }
        });
      }

      // Create user
      const user = await User.register({
        username,
        email,
        password,
        display_name
      });

      // Generate tokens
      const accessToken = User.generateAccessToken(user);
      const refreshToken = User.generateRefreshToken();

      // Store refresh token
      await User.storeRefreshToken(
        user.id,
        refreshToken,
        req.headers['user-agent'],
        req.ip
      );

      // Set refresh token cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: config.cookie.domain
      });

      res.status(201).json({
        user,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600
        }
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to register user'
        }
      });
    }
  },

  // Login user
  async login(req, res) {
    try {
      // Validate input
      const { error } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { username_or_email, password } = req.body;

      // Login user
      const user = await User.login(username_or_email, password);

      // Generate tokens
      const accessToken = User.generateAccessToken(user);
      const refreshToken = User.generateRefreshToken();

      // Store refresh token
      await User.storeRefreshToken(
        user.id,
        refreshToken,
        req.headers['user-agent'],
        req.ip
      );

      // Set refresh token cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: config.cookie.domain
      });

      res.json({
        user,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.message === 'Invalid credentials') {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid username/email or password'
          }
        });
      }

      if (err.message === 'Account is deactivated') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Account is deactivated'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to login'
        }
      });
    }
  },

  // Refresh access token
  async refresh(req, res) {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token required'
          }
        });
      }

      // Decode token to get user id
      const tokenParts = refreshToken.split('-');
      // Since we're using UUIDs, we need to find the token in the database
      // This is a simplified approach - in production you'd want to check all tokens

      // For now, let's get user from request if available
      // A better approach would be to hash and store a lookup
      
      // Find user by refresh token
      const userId = req.user?.id; // This requires middleware, so let's do it differently
      
      // Actually, let's decode the JWT if present or handle differently
      // For this implementation, we'll get the user from the database by checking all their tokens
      
      // Get user id from auth header if available
      const authHeader = req.headers['authorization'];
      let userId = null;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true });
          userId = decoded.sub;
        } catch (e) {
          // Invalid token, continue without user id
        }
      }

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Could not identify user'
          }
        });
      }

      // Verify refresh token
      const storedToken = await User.verifyRefreshToken(userId, refreshToken);

      if (!storedToken) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired refresh token'
          }
        });
      }

      // Get user
      const user = await User.findById(userId);

      if (!user || !user.is_active) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found or inactive'
          }
        });
      }

      // Revoke old refresh token (rotation)
      await User.revokeRefreshToken(storedToken.id);

      // Generate new tokens
      const newAccessToken = User.generateAccessToken(user);
      const newRefreshToken = User.generateRefreshToken();

      // Store new refresh token
      await User.storeRefreshToken(
        user.id,
        newRefreshToken,
        req.headers['user-agent'],
        req.ip
      );

      // Set new refresh token cookie
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        domain: config.cookie.domain
      });

      res.json({
        access_token: newAccessToken,
        expires_in: 3600
      });
    } catch (err) {
      console.error('Refresh error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to refresh token'
        }
      });
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;
      const userId = req.user?.id;

      if (refreshToken && userId) {
        // Find and revoke the specific token
        const storedToken = await User.verifyRefreshToken(userId, refreshToken);
        if (storedToken) {
          await User.revokeRefreshToken(storedToken.id);
        }
      }

      // Clear cookie
      res.clearCookie('refresh_token', {
        domain: config.cookie.domain
      });

      res.status(204).send();
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to logout'
        }
      });
    }
  },

  // Logout all devices
  async logoutAll(req, res) {
    try {
      const userId = req.user?.id;

      if (userId) {
        await User.revokeAllUserTokens(userId);
      }

      // Clear cookie
      res.clearCookie('refresh_token', {
        domain: config.cookie.domain
      });

      res.status(204).send();
    } catch (err) {
      console.error('Logout all error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to logout from all devices'
        }
      });
    }
  },

  // Get current user
  async me(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated'
          }
        });
      }

      const user = await User.getUserWithCollectives(userId);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.json(user);
    } catch (err) {
      console.error('Get me error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user'
        }
      });
    }
  }
};

module.exports = AuthController;
