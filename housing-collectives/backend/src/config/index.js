require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '1h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '30d',
  },
  
  // Cookie Configuration
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.COOKIE_SECURE === 'true' || false,
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',
  },
  
  // Rate Limiting
  rateLimit: {
    auth: {
      windowMs: 60 * 1000, // 1 minute
      max: 5 // 5 requests per minute
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 100 // 100 requests per minute
    }
  },
  
  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  
  // Email (placeholder)
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromAddress: process.env.FROM_EMAIL || 'noreply@housingcollectives.eu'
  }
};
