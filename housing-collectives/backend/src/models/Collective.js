const BaseModel = require('./BaseModel');
const db = require('../db');

class CollectiveModel extends BaseModel {
  constructor() {
    super('collectives');
  }

  // Find by slug
  async findBySlug(slug) {
    const query = 'SELECT * FROM collectives WHERE slug = $1';
    const result = await db.query(query, [slug.toLowerCase()]);
    return result.rows[0] || null;
  }

  // Check if slug exists
  async slugExists(slug) {
    const collective = await this.findBySlug(slug);
    return !!collective;
  }

  // Create collective with membership
  async createWithMembership(data, creatorId) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Create collective
      const collectiveQuery = `
        INSERT INTO collectives (
          slug, name, description, location, location_address, 
          location_country, location_city, founded_at, capacity,
          website_url, contact_email, is_public, accepting_members,
          application_required, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
          $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        ) RETURNING *
      `;

      const collectiveValues = [
        data.slug.toLowerCase(),
        data.name,
        data.description || null,
        data.location?.lng || null,
        data.location?.lat || null,
        data.location?.address || null,
        data.location?.country || null,
        data.location?.city || null,
        data.founded_at || null,
        data.capacity || null,
        data.website_url || null,
        data.contact_email || null,
        data.is_public !== false, // default true
        data.accepting_members !== false, // default true
        data.application_required !== false, // default true
        creatorId
      ];

      const collectiveResult = await client.query(collectiveQuery, collectiveValues);
      const collective = collectiveResult.rows[0];

      // Create admin membership for creator
      const membershipQuery = `
        INSERT INTO collective_memberships (
          collective_id, user_id, role, joined_at, created_at, updated_at
        ) VALUES ($1, $2, 'admin', NOW(), NOW(), NOW())
        RETURNING *
      `;

      await client.query(membershipQuery, [collective.id, creatorId]);

      await client.query('COMMIT');

      return collective;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Update collective
  async updateCollective(id, data) {
    const allowedFields = [
      'name', 'description', 'location_address', 'location_country',
      'location_city', 'founded_at', 'capacity', 'current_residents',
      'website_url', 'contact_email', 'cover_image_url', 'gallery_images',
      'is_public', 'accepting_members', 'application_required'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Handle location separately
    if (data.location && data.location.lat && data.location.lng) {
      setClause.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography`);
      values.push(data.location.lng, data.location.lat);
      paramIndex += 2;
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE collectives
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *, 
        ST_X(location::geometry) as lng,
        ST_Y(location::geometry) as lat
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get collective with member count
  async getWithMemberCount(slug) {
    const query = `
      SELECT c.*,
        COUNT(DISTINCT cm.user_id) as member_count,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat
      FROM collectives c
      LEFT JOIN collective_memberships cm ON c.id = cm.collective_id 
        AND cm.role IN ('admin', 'member')
      WHERE c.slug = $1
      GROUP BY c.id
    `;
    const result = await db.query(query, [slug]);
    return result.rows[0] || null;
  }

  // List collectives with filtering
  async listCollectives(options = {}) {
    let query = `
      SELECT c.*,
        COUNT(DISTINCT cm.user_id) as member_count,
        ST_X(c.location::geometry) as lng,
        ST_Y(c.location::geometry) as lat
      FROM collectives c
      LEFT JOIN collective_memberships cm ON c.id = cm.collective_id 
        AND cm.role IN ('admin', 'member')
    `;

    const whereClause = [];
    const params = [];
    let paramIndex = 1;

    // Only show public collectives unless specified
    if (!options.includePrivate) {
      whereClause.push('c.is_public = true');
    }

    if (options.accepting_members !== undefined) {
      whereClause.push(`c.accepting_members = $${paramIndex}`);
      params.push(options.accepting_members);
      paramIndex++;
    }

    if (options.country) {
      whereClause.push(`c.location_country = $${paramIndex}`);
      params.push(options.country.toUpperCase());
      paramIndex++;
    }

    if (options.city) {
      whereClause.push(`c.location_city ILIKE $${paramIndex}`);
      params.push(`%${options.city}%`);
      paramIndex++;
    }

    if (options.q) {
      whereClause.push(`(c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      params.push(`%${options.q}%`);
      paramIndex++;
    }

    // Geo search
    if (options.lat && options.lng && options.radius) {
      whereClause.push(`ST_DWithin(c.location, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography, $${paramIndex + 2} * 1000)`);
      params.push(options.lng, options.lat, options.radius);
      paramIndex += 3;
    }

    if (whereClause.length > 0) {
      query += ' WHERE ' + whereClause.join(' AND ');
    }

    query += ' GROUP BY c.id';

    // Ordering
    if (options.lat && options.lng) {
      query += ` ORDER BY ST_Distance(c.location, ST_SetSRID(ST_MakePoint($${paramIndex}, $${paramIndex + 1}), 4326)::geography)`;
      params.push(options.lng, options.lat);
      paramIndex += 2;
    } else {
      query += ' ORDER BY c.created_at DESC';
    }

    // Pagination
    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  // Get members of a collective
  async getMembers(collectiveId, options = {}) {
    let query = `
      SELECT cm.*, u.username, u.display_name, u.avatar_url, u.bio
      FROM collective_memberships cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.collective_id = $1
    `;

    const params = [collectiveId];
    let paramIndex = 2;

    if (options.role) {
      query += ` AND cm.role = $${paramIndex}`;
      params.push(options.role);
      paramIndex++;
    }

    query += ' ORDER BY cm.joined_at ASC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  // Get user's membership in collective
  async getMembership(collectiveId, userId) {
    const query = `
      SELECT * FROM collective_memberships
      WHERE collective_id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [collectiveId, userId]);
    return result.rows[0] || null;
  }

  // Join collective (create membership)
  async joinCollective(collectiveId, userId, applicationMessage = null) {
    const collective = await this.findById(collectiveId);
    
    if (!collective) {
      throw new Error('Collective not found');
    }

    // Check if already a member
    const existing = await this.getMembership(collectiveId, userId);
    if (existing) {
      throw new Error('Already a member or pending');
    }

    const role = collective.application_required ? 'pending' : 'member';

    const query = `
      INSERT INTO collective_memberships (
        collective_id, user_id, role, application_message, applied_at, joined_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), ${collective.application_required ? 'NULL' : 'NOW()'}, NOW(), NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      collectiveId,
      userId,
      role,
      applicationMessage
    ]);

    return result.rows[0];
  }

  // Leave collective
  async leaveCollective(collectiveId, userId) {
    const query = `
      DELETE FROM collective_memberships
      WHERE collective_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [collectiveId, userId]);
    return result.rows[0];
  }

  // Update member role
  async updateMemberRole(collectiveId, userId, role) {
    const query = `
      UPDATE collective_memberships
      SET role = $1, updated_at = NOW()
      WHERE collective_id = $2 AND user_id = $3
      RETURNING *
    `;
    const result = await db.query(query, [role, collectiveId, userId]);
    return result.rows[0];
  }

  // Check if user is admin
  async isAdmin(collectiveId, userId) {
    const membership = await this.getMembership(collectiveId, userId);
    return membership && membership.role === 'admin';
  }

  // Check if user is member (including admin)
  async isMember(collectiveId, userId) {
    const membership = await this.getMembership(collectiveId, userId);
    return membership && (membership.role === 'member' || membership.role === 'admin');
  }
}

module.exports = new CollectiveModel();
