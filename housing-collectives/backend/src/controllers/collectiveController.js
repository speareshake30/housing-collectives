const Joi = require('joi');
const Collective = require('../models/Collective');

// Validation schemas
const createSchema = Joi.object({
  slug: Joi.string().pattern(/^[a-z0-9-]{3,50}$/).required()
    .messages({
      'string.pattern.base': 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only'
    }),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(2000).optional(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    country: Joi.string().length(2).uppercase().optional()
  }).required(),
  founded_at: Joi.date().optional(),
  capacity: Joi.number().integer().min(1).optional(),
  website_url: Joi.string().uri().optional(),
  contact_email: Joi.string().email().optional(),
  is_public: Joi.boolean().optional(),
  accepting_members: Joi.boolean().optional(),
  application_required: Joi.boolean().optional()
});

const updateSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(2000).optional(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    country: Joi.string().length(2).uppercase().optional()
  }).optional(),
  founded_at: Joi.date().optional(),
  capacity: Joi.number().integer().min(1).optional(),
  current_residents: Joi.number().integer().min(0).optional(),
  website_url: Joi.string().uri().optional(),
  contact_email: Joi.string().email().optional(),
  cover_image_url: Joi.string().uri().optional(),
  gallery_images: Joi.array().items(Joi.string()).optional(),
  is_public: Joi.boolean().optional(),
  accepting_members: Joi.boolean().optional(),
  application_required: Joi.boolean().optional()
});

const joinSchema = Joi.object({
  message: Joi.string().max(1000).optional()
});

const CollectiveController = {
  // List collectives
  async list(req, res) {
    try {
      const options = {
        lat: req.query.lat ? parseFloat(req.query.lat) : undefined,
        lng: req.query.lng ? parseFloat(req.query.lng) : undefined,
        radius: req.query.radius ? parseInt(req.query.radius) : undefined,
        country: req.query.country,
        city: req.query.city,
        accepting_members: req.query.accepting_members !== undefined ? 
          req.query.accepting_members === 'true' : undefined,
        q: req.query.q,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
        includePrivate: false // Only public by default
      };

      const collectives = await Collective.listCollectives(options);

      res.json({
        data: collectives.map(c => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          location: c.lat ? {
            lat: parseFloat(c.lat),
            lng: parseFloat(c.lng),
            address: c.location_address,
            city: c.location_city,
            country: c.location_country
          } : null,
          cover_image_url: c.cover_image_url,
          member_count: parseInt(c.member_count) || 0,
          capacity: c.capacity,
          accepting_members: c.accepting_members,
          founded_at: c.founded_at,
          distance_km: req.query.lat && req.query.lng && c.distance ? 
            Math.round(c.distance / 1000 * 10) / 10 : undefined
        })),
        pagination: {
          limit: options.limit,
          offset: options.offset,
          has_more: collectives.length === options.limit
        }
      });
    } catch (err) {
      console.error('List collectives error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch collectives'
        }
      });
    }
  },

  // Get single collective
  async get(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      const collective = await Collective.getWithMemberCount(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      // Check membership if user is authenticated
      let userRole = null;
      let isMember = false;
      if (userId) {
        const membership = await Collective.getMembership(collective.id, userId);
        if (membership) {
          userRole = membership.role;
          isMember = membership.role === 'member' || membership.role === 'admin';
        }
      }

      res.json({
        id: collective.id,
        slug: collective.slug,
        name: collective.name,
        description: collective.description,
        location: collective.lat ? {
          lat: parseFloat(collective.lat),
          lng: parseFloat(collective.lng),
          address: collective.location_address,
          city: collective.location_city,
          country: collective.location_country
        } : null,
        founded_at: collective.founded_at,
        capacity: collective.capacity,
        current_residents: collective.current_residents,
        member_count: parseInt(collective.member_count) || 0,
        website_url: collective.website_url,
        contact_email: collective.contact_email,
        cover_image_url: collective.cover_image_url,
        gallery_images: collective.gallery_images || [],
        is_public: collective.is_public,
        accepting_members: collective.accepting_members,
        application_required: collective.application_required,
        created_at: collective.created_at,
        is_member: isMember,
        user_role: userRole
      });
    } catch (err) {
      console.error('Get collective error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch collective'
        }
      });
    }
  },

  // Create collective
  async create(req, res) {
    try {
      // Validate input
      const { error } = createSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { slug } = req.body;
      const userId = req.user.id;

      // Check if slug exists
      if (await Collective.slugExists(slug)) {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Collective with this slug already exists'
          }
        });
      }

      // Create collective
      const collective = await Collective.createWithMembership(req.body, userId);

      res.status(201).json({
        id: collective.id,
        slug: collective.slug,
        name: collective.name,
        description: collective.description,
        location: req.body.location,
        founded_at: collective.founded_at,
        capacity: collective.capacity,
        website_url: collective.website_url,
        contact_email: collective.contact_email,
        is_public: collective.is_public,
        accepting_members: collective.accepting_members,
        application_required: collective.application_required,
        created_at: collective.created_at
      });
    } catch (err) {
      console.error('Create collective error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create collective'
        }
      });
    }
  },

  // Update collective
  async update(req, res) {
    try {
      const { error } = updateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { slug } = req.params;
      const userId = req.user.id;

      // Find collective
      const collective = await Collective.findBySlug(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      // Check if user is admin
      const isAdmin = await Collective.isAdmin(collective.id, userId);
      if (!isAdmin) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins can update collectives'
          }
        });
      }

      // Update
      const updated = await Collective.updateCollective(collective.id, req.body);

      res.json({
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        location: updated.lat ? {
          lat: parseFloat(updated.lat),
          lng: parseFloat(updated.lng),
          address: updated.location_address,
          city: updated.location_city,
          country: updated.location_country
        } : null,
        founded_at: updated.founded_at,
        capacity: updated.capacity,
        current_residents: updated.current_residents,
        website_url: updated.website_url,
        contact_email: updated.contact_email,
        cover_image_url: updated.cover_image_url,
        gallery_images: updated.gallery_images || [],
        is_public: updated.is_public,
        accepting_members: updated.accepting_members,
        application_required: updated.application_required,
        updated_at: updated.updated_at
      });
    } catch (err) {
      console.error('Update collective error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update collective'
        }
      });
    }
  },

  // Get members
  async getMembers(req, res) {
    try {
      const { slug } = req.params;

      const collective = await Collective.findBySlug(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      const options = {
        role: req.query.role,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const members = await Collective.getMembers(collective.id, options);

      res.json({
        data: members.map(m => ({
          user: {
            id: m.user_id,
            username: m.username,
            display_name: m.display_name,
            avatar_url: m.avatar_url
          },
          role: m.role,
          joined_at: m.joined_at
        })),
        pagination: {
          limit: options.limit,
          offset: options.offset,
          has_more: members.length === options.limit
        }
      });
    } catch (err) {
      console.error('Get members error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch members'
        }
      });
    }
  },

  // Join collective
  async join(req, res) {
    try {
      const { error } = joinSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { slug } = req.params;
      const userId = req.user.id;
      const { message } = req.body;

      const collective = await Collective.findBySlug(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      if (!collective.accepting_members) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'This collective is not accepting new members'
          }
        });
      }

      const membership = await Collective.joinCollective(
        collective.id,
        userId,
        message
      );

      res.status(201).json({
        collective_id: membership.collective_id,
        role: membership.role,
        message: collective.application_required ? 
          'Application submitted for review' : 
          'You are now a member',
        applied_at: membership.applied_at,
        joined_at: membership.joined_at
      });
    } catch (err) {
      console.error('Join collective error:', err);

      if (err.message === 'Collective not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      if (err.message === 'Already a member or pending') {
        return res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'Already a member or have a pending application'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join collective'
        }
      });
    }
  },

  // Leave collective
  async leave(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.user.id;

      const collective = await Collective.findBySlug(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      await Collective.leaveCollective(collective.id, userId);

      res.status(204).send();
    } catch (err) {
      console.error('Leave collective error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to leave collective'
        }
      });
    }
  },

  // Update member role
  async updateRole(req, res) {
    try {
      const { slug, user_id } = req.params;
      const { role } = req.body;
      const adminId = req.user.id;

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role must be admin or member'
          }
        });
      }

      const collective = await Collective.findBySlug(slug);

      if (!collective) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Collective not found'
          }
        });
      }

      // Check if requester is admin
      const isAdmin = await Collective.isAdmin(collective.id, adminId);
      if (!isAdmin) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins can update member roles'
          }
        });
      }

      const membership = await Collective.updateMemberRole(
        collective.id,
        user_id,
        role
      );

      if (!membership) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Member not found'
          }
        });
      }

      res.json({
        user_id: membership.user_id,
        role: membership.role,
        updated_at: membership.updated_at
      });
    } catch (err) {
      console.error('Update role error:', err);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update member role'
        }
      });
    }
  }
};

module.exports = CollectiveController;
