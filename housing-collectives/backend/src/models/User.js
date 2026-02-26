const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./BaseModel');
const db = require('../db');
const config = require('../config');

const SALT_ROUNDS = 12;

class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  // Find user by username
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username.toLowerCase()]);
    return result.rows[0] || null;
  }

  // Find user by email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  // Find user by username or email (for login)
  async findByUsernameOrEmail(usernameOrEmail) {
    const query = `
      SELECT * FROM users 
      WHERE username = $1 OR email = $1
    `;
    const result = await db.query(query, [usernameOrEmail.toLowerCase()]);
    return result.rows[0] || null;
  }

  // Check if username exists
  async usernameExists(username) {
    const user = await this.findByUsername(username);
    return !!user;
  }

  // Check if email exists
  async emailExists(email) {
    const user = await this.findByEmail(email);
    return !!user;
  }

  // Hash password
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT access token
  generateAccessToken(user) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      jti: uuidv4()
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: 'housingcollectives.eu',
      audience: 'housingcollectives.eu'
    });
  }

  // Generate refresh token (opaque string)
  generateRefreshToken() {
    return uuidv4() + uuidv4(); // 64 character token
  }

  // Hash refresh token for storage
  hashRefreshToken(token) {
    return bcrypt.hashSync(token, 10);
  }

  // Store refresh token in database
  async storeRefreshToken(userId, token, deviceInfo = null, ipAddress = null) {
    const hashedToken = this.hashRefreshToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const result = await db.query(query, [
      userId,
      hashedToken,
      deviceInfo,
      ipAddress,
      expiresAt
    ]);

    return result.rows[0].id;
  }

  // Verify refresh token
  async verifyRefreshToken(userId, token) {
    // Get all non-expired, non-revoked tokens for user
    const query = `
      SELECT * FROM refresh_tokens
      WHERE user_id = $1 AND expires_at > NOW() AND revoked_at IS NULL
    `;
    const result = await db.query(query, [userId]);

    // Find matching token (compare hashed versions)
    for (const row of result.rows) {
      if (bcrypt.compareSync(token, row.token_hash)) {
        return row;
      }
    }

    return null;
  }

  // Revoke refresh token
  async revokeRefreshToken(tokenId) {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [tokenId]);
    return result.rows[0];
  }

  // Revoke all refresh tokens for user
  async revokeAllUserTokens(userId) {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  // Register new user
  async register(userData) {
    const { username, email, password, display_name } = userData;

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await this.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      display_name: display_name || username,
      created_at: new Date(),
      updated_at: new Date()
    });

    return this.sanitizeUser(user);
  }

  // Login user
  async login(usernameOrEmail, password) {
    const user = await this.findByUsernameOrEmail(usernameOrEmail);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const isValidPassword = await this.verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.update(user.id, { last_login_at: new Date() });

    return this.sanitizeUser(user);
  }

  // Get user with collectives
  async getUserWithCollectives(userId) {
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [userId]);
    const user = userResult.rows[0];

    if (!user) return null;

    // Get user's collectives
    const collectivesQuery = `
      SELECT c.id, c.name, c.slug, cm.role
      FROM collectives c
      JOIN collective_memberships cm ON c.id = cm.collective_id
      WHERE cm.user_id = $1 AND cm.role IN ('admin', 'member')
    `;
    const collectivesResult = await db.query(collectivesQuery, [userId]);

    return {
      ...this.sanitizeUser(user),
      collectives: collectivesResult.rows
    };
  }

  // Update user profile
  async updateProfile(userId, updates) {
    const allowedFields = ['display_name', 'bio', 'avatar_url', 'location_visible', 
                           'preferred_language', 'notification_preferences'];
    
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return this.sanitizeUser(result.rows[0]);
  }

  // Update location
  async updateLocation(userId, lat, lng) {
    const query = `
      UPDATE users
      SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [lng, lat, userId]);
    return this.sanitizeUser(result.rows[0]);
  }

  // Get public profile (limited info)
  getPublicProfile(user) {
    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    };
  }

  // Sanitize user object (remove sensitive data)
  sanitizeUser(user) {
    if (!user) return null;
    const sanitized = { ...user };
    delete sanitized.password_hash;
    return sanitized;
  }
}

module.exports = new UserModel();
