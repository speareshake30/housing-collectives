const Joi = require('joi');
const User = require('../models/User');

// Validation schemas
const updateProfileSchema = Joi.object({
  display_name: Joi.string().max(50).optional(),
  bio: Joi.string().max(1000).optional(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional(),
  location_visible: Joi.boolean().optional(),
  preferred_language: Joi.string().length(2).optional(),
  notification_preferences: Joi.object().optional()
});

const UserController = {
  // Get current user profile
  async me(req, res) {
    try {
      const userId = req.user.id;
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
      console.error('Get profile error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch profile'
        }
      });
    }
  },

  // Update current user profile
  async update(req, res) {
    try {
      const { error } = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const userId = req.user.id;
      const updates = { ...req.body };

      // Handle location separately
      if (updates.location) {
        await User.updateLocation(userId, updates.location.lat, updates.location.lng);
        delete updates.location;
      }

      const user = await User.updateProfile(userId, updates);

      res.json(user);
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update profile'
        }
      });
    }
  },

  // Get public user profile
  async getByUsername(req, res) {
    try {
      const { username } = req.params;
      const user = await User.findByUsername(username);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Get user's collectives
      const collectivesQuery = `
        SELECT c.id, c.name, c.slug, cm.role
        FROM collectives c
        JOIN collective_memberships cm ON c.id = cm.collective_id
        WHERE cm.user_id = $1 AND cm.role IN ('admin', 'member') AND c.is_public = true
      `;
      const collectivesResult = await require('../db').query(collectivesQuery, [user.id]);

      const profile = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location: user.location_visible ? {
          city: user.location_city,
          country: user.location_country
        } : null,
        collectives: collectivesResult.rows,
        created_at: user.created_at
      };

      res.json(profile);
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user'
        }
      });
    }
  },

  // Upload avatar
  async uploadAvatar(req, res) {
    // Placeholder - would integrate with file upload service
    res.json({
      message: 'Avatar upload endpoint - integrate with file service'
    });
  }
};

module.exports = UserController;
