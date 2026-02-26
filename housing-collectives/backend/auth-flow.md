# Authentication Flow Documentation
## European Housing Collectives Community

**Version:** 1.0  
**Date:** 2024

---

## Overview

We use **JWT (JSON Web Tokens)** for stateless authentication with refresh token rotation for security. This provides:
- Scalable, stateless API authentication
- Secure token refresh mechanism
- Multi-device support
- Easy revocation capabilities

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client     │────▶│   API Gateway    │────▶│   Auth      │
│  (Browser/   │     │   (Nginx/        │     │   Service   │
│   Mobile)    │◀────│   Express)       │◀────│   (Node.js) │
└──────────────┘     └──────────────────┘     └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  PostgreSQL │
                       │  (Users,    │
                       │   Tokens)   │
                       └─────────────┘
```

---

## Token Types

### Access Token
- **Type:** JWT (RS256 signed)
- **Lifetime:** 1 hour (3600 seconds)
- **Storage:** Memory only (JavaScript variable, NOT localStorage/cookies)
- **Usage:** Sent in `Authorization: Bearer <token>` header for all API requests

**Payload:**
```json
{
  "sub": "user-uuid",
  "username": "treehugger_42",
  "email": "user@example.com",
  "role": "user",
  "iat": 1708452000,
  "exp": 1708455600,
  "jti": "unique-token-id"
}
```

### Refresh Token
- **Type:** Opaque string (not JWT)
- **Lifetime:** 30 days
- **Storage:** HttpOnly, Secure, SameSite=Strict cookie
- **Usage:** Sent automatically by browser, used to get new access tokens

**Database Storage:**
```sql
refresh_tokens:
  - id: uuid
  - user_id: uuid (foreign key)
  - token_hash: varchar(255) -- SHA-256 hashed
  - device_info: text
  - ip_address: inet
  - expires_at: timestamp
  - revoked_at: timestamp
  - created_at: timestamp
```

---

## Authentication Flows

### 1. Registration Flow

```
User                          API                           Database
  │                             │                               │
  │  POST /auth/register        │                               │
  │ ─────────────────────────▶  │                               │
  │  {username, email,          │                               │
  │   password, display_name}   │                               │
  │                             │  1. Validate input            │
  │                             │  2. Check username/email      │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  3. Hash password (bcrypt)    │
  │                             │  4. Create user record        │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  5. Generate email token      │
  │                             │  6. Store verification token  │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  7. Send verification email   │
  │                             │     (via SendGrid/AWS SES)    │
  │                             │                               │
  │                             │  8. Generate JWT pair         │
  │                             │                               │
  │  201 Created                │                               │
  │ ◀─────────────────────────  │                               │
  │  {user, tokens: {           │                               │
  │    access_token,            │                               │
  │    refresh_token}}          │                               │
  │                             │                               │
  │                             │  Set-Cookie: refresh_token=   │
  │                             │  HttpOnly; Secure;            │
  │                             │  SameSite=Strict;             │
  │                             │  Max-Age=2592000              │
```

**Key Points:**
- User can log in immediately but sees "verify email" banner
- Some features blocked until email verified
- Verification email includes link: `https://housingcollectives.eu/verify-email?token=xyz`

---

### 2. Login Flow

```
User                          API                           Database
  │                             │                               │
  │  POST /auth/login           │                               │
  │ ─────────────────────────▶  │                               │
  │  {username_or_email,        │                               │
  │   password}                 │                               │
  │                             │  1. Find user by username     │
  │                             │     or email                  │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  2. Verify password (bcrypt)  │
  │                             │                               │
  │                             │  3. Check if user active      │
  │                             │                               │
  │                             │  4. Create refresh token      │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  5. Generate access token     │
  │                             │                               │
  │  200 OK                     │                               │
  │ ◀─────────────────────────  │                               │
  │  {user, tokens: {           │                               │
  │    access_token,            │                               │
  │    refresh_token}}          │                               │
  │                             │                               │
  │                             │  Set-Cookie: refresh_token=   │
  │                             │  HttpOnly; Secure;            │
  │                             │  SameSite=Strict              │
```

**Security Features:**
- Rate limiting: 5 attempts per IP per minute
- Progressive delay after failed attempts
- Login notifications for new devices/locations
- Refresh token bound to device fingerprint

---

### 3. Token Refresh Flow

```
User                          API                           Database
  │                             │                               │
  │  POST /auth/refresh         │                               │
  │ ─────────────────────────▶  │                               │
  │  Cookie: refresh_token=xxx  │                               │
  │                             │                               │
  │                             │  1. Extract refresh token     │
  │                             │     from cookie               │
  │                             │                               │
  │                             │  2. Hash token and lookup     │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  3. Validate:                 │
  │                             │     - Not expired             │
  │                             │     - Not revoked             │
  │                             │     - User is active          │
  │                             │                               │
  │                             │  4. ROTATE: Create new        │
  │                             │     refresh token             │
  │                             │  5. REVOKE old refresh token  │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  6. Generate new access token │
  │                             │                               │
  │  200 OK                     │                               │
  │ ◀─────────────────────────  │                               │
  │  {access_token}             │                               │
  │                             │                               │
  │                             │  Set-Cookie: refresh_token=   │
  │                             │  (new token, HttpOnly)        │
```

**Token Rotation Benefits:**
- Limits window of compromise if refresh token stolen
- Old token immediately invalid after rotation
- Automatic detection of token reuse (possible theft)

---

### 4. Logout Flow

```
User                          API                           Database
  │                             │                               │
  │  POST /auth/logout          │                               │
  │  Authorization: Bearer ...  │                               │
  │  Cookie: refresh_token=xxx  │                               │
  │ ─────────────────────────▶  │                               │
  │                             │                               │
  │                             │  1. Validate access token     │
  │                             │                               │
  │                             │  2. Revoke refresh token      │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │  204 No Content             │                               │
  │ ◀─────────────────────────  │                               │
  │                             │                               │
  │                             │  Set-Cookie: refresh_token=   │
  │                             │  Max-Age=0 (clear cookie)     │
```

**Logout All Devices:**
```
POST /auth/logout-all
Revokes ALL refresh tokens for user across all devices
```

---

### 5. Email Verification Flow

```
User                          API                           Database
  │                             │                               │
  │  GET /auth/verify-email     │                               │
  │  ?token=verification_token  │                               │
  │ ─────────────────────────▶  │                               │
  │                             │  1. Validate token            │
  │                             │  2. Lookup user               │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │                             │  3. Mark email as verified    │
  │                             │  4. Delete verification token │
  │                             │ ───────────────────────────▶  │
  │                             │                               │
  │  302 Redirect to            │                               │
  │  /email-verified?success=true                             │
  │ ◀─────────────────────────  │                               │
```

---

### 6. Password Reset Flow

```
User                          API                           Database         Email Service
  │                             │                               │                    │
  │  POST /auth/forgot-password │                               │                    │
  │  {email}                    │                               │                    │
  │ ─────────────────────────▶  │                               │                    │
  │                             │  1. Lookup user by email      │                    │
  │                             │ ───────────────────────────▶  │                    │
  │                             │                               │                    │
  │                             │  2. Generate reset token      │                    │
  │                             │  3. Store hashed token        │                    │
  │                             │ ───────────────────────────▶  │                    │
  │                             │                               │                    │
  │                             │  4. Send reset email          │───────────────────▶│
  │  200 OK                     │                               │                    │
  │  (always, even if email     │                               │                    │
  │   doesn't exist)            │                               │                    │
  │ ◀─────────────────────────  │                               │                    │
  │                             │                               │                    │
  │                             │                               │                    │
  │  GET /auth/reset-password   │                               │                    │
  │  ?token=reset_token         │                               │                    │
  │ ─────────────────────────▶  │  (Validate token, show form)  │                    │
  │                             │                               │                    │
  │  POST /auth/reset-password  │                               │                    │
  │  {token, new_password}      │                               │                    │
  │ ─────────────────────────▶  │                               │                    │
  │                             │  5. Validate token            │                    │
  │                             │  6. Check not expired         │                    │
  │                             │  7. Check not used            │                    │
  │                             │ ───────────────────────────▶  │                    │
  │                             │                               │                    │
  │                             │  8. Hash new password         │                    │
  │                             │  9. Update user password      │                    │
  │                             │  10. Mark token as used       │                    │
  │                             │  11. Revoke all refresh tokens│                    │
  │                             │ ───────────────────────────▶  │                    │
  │                             │                               │                    │
  │  200 OK                     │                               │                    │
  │  {message: "Password         │                               │                    │
  │   reset successful"}        │                               │                    │
  │ ◀─────────────────────────  │                               │                    │
```

---

## Token Storage (Client-Side)

### Web Application

**Access Token:**
```javascript
// Store in memory ONLY (JavaScript variable)
let accessToken = null;

// Never use:
// ❌ localStorage.setItem('accessToken', token)
// ❌ document.cookie = `accessToken=${token}`
```

**Refresh Token:**
```javascript
// Automatically handled by browser via HttpOnly cookie
// Not accessible to JavaScript
// Sent with every request to same domain
```

### Mobile Application

**Access Token:**
```swift
// iOS - Keychain (secure enclave)
let accessToken = KeychainWrapper.standard.string(forKey: "accessToken")
```
```kotlin
// Android - EncryptedSharedPreferences
val accessToken = encryptedPrefs.getString("access_token", null)
```

**Refresh Token:**
```swift
// iOS - Keychain
KeychainWrapper.standard.set(refreshToken, forKey: "refreshToken")
```
```kotlin
// Android - EncryptedSharedPreferences
encryptedPrefs.edit().putString("refresh_token", refreshToken).apply()
```

---

## API Request Authentication

### Authenticated Request

```http
GET /api/v1/users/me HTTP/1.1
Host: api.housingcollectives.eu
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

### Token Validation (Server-Side)

```javascript
// Express middleware example
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: { code: 'UNAUTHORIZED', message: 'Access token required' }
    });
  }

  jwt.verify(token, process.env.JWT_PUBLIC_KEY, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
        });
      }
      return res.status(403).json({ 
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });
    }

    req.user = decoded;
    next();
  });
};
```

---

## Security Considerations

### 1. Token Security

| Threat | Mitigation |
|--------|------------|
| XSS stealing tokens | Access token in memory only, refresh token HttpOnly |
| CSRF attacks | SameSite=Strict cookies, stateless auth |
| Token theft | Short-lived access tokens, refresh token rotation |
| Token replay | JTI claim + blacklist for revoked tokens |
| Brute force | Rate limiting on auth endpoints |

### 2. Password Security

```javascript
// bcrypt configuration
const SALT_ROUNDS = 12; // ~250ms hash time

// Hash password
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verify password
const valid = await bcrypt.compare(password, hash);
```

### 3. JWT Configuration

```javascript
// Token generation
const accessToken = jwt.sign(
  {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    jti: crypto.randomUUID() // Unique token ID
  },
  process.env.JWT_PRIVATE_KEY,
  {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: 'housingcollectives.eu',
    audience: 'housingcollectives.eu'
  }
);
```

### 4. CORS Policy

```javascript
// Strict CORS for production
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        TOKEN LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   Register   │
  │    / Login   │
  └──────┬───────┘
         │
         ▼
  ┌─────────────────────────────────────┐
  │  ┌──────────────┐  ┌─────────────┐ │
  │  │ Access Token │  │Refresh Token│ │
  │  │   1 hour     │  │  30 days    │ │
  │  │   (memory)   │  │  (cookie)   │ │
  │  └──────┬───────┘  └──────┬──────┘ │
  │         │                 │        │
  │         │                 │        │
  │         ▼                 │        │
  │  ┌──────────────┐         │        │
  │  │   Expired?   │─────────┼────────┤
  │  │  (after 1h)  │         │        │
  │  └──────┬───────┘         │        │
  │         │                 │        │
  │    Yes  │                 │        │
  │         ▼                 │        │
  │  ┌──────────────┐         │        │
  │  │POST /refresh │◀────────┘        │
  │  │  (cookie)    │                  │
  │  └──────┬───────┘                  │
  │         │                          │
  │         ▼                          │
  │  ┌──────────────┐  ┌─────────────┐ │
  │  │ NEW Access   │  │NEW Refresh  │ │
  │  │   Token      │  │   Token     │ │
  │  │  (memory)    │  │  (cookie)   │ │
  │  └──────────────┘  └─────────────┘ │
  │         │                          │
  │         ▼                          │
  │  ┌──────────────┐                  │
  │  │ OLD Refresh  │                  │
  │  │   REVOKED    │                  │
  │  └──────────────┘                  │
  └─────────────────────────────────────┘
         │
         ▼
  ┌──────────────┐
  │    Logout    │
  │   / Logout   │
  │    All       │
  └──────┬───────┘
         │
         ▼
  ┌─────────────────────────────────────┐
  │  Both tokens revoked / cleared      │
  └─────────────────────────────────────┘
```

---

## Environment Variables

```bash
# JWT Configuration
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
... (PEM format)
-----END RSA PRIVATE KEY-----"

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
... (PEM format)
-----END PUBLIC KEY-----"

# Token Lifetimes
ACCESS_TOKEN_EXPIRY=3600        # 1 hour (seconds)
REFRESH_TOKEN_EXPIRY=2592000    # 30 days (seconds)

# Cookie Settings
COOKIE_DOMAIN=.housingcollectives.eu
COOKIE_SECURE=true              # HTTPS only
COOKIE_SAME_SITE=strict

# Rate Limiting
AUTH_RATE_LIMIT=5               # attempts per minute
AUTH_RATE_LIMIT_WINDOW=60       # seconds

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG.xxx
```

---

## API Endpoints Summary

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/auth/register` | POST | No | Create new account |
| `/auth/login` | POST | No | Authenticate user |
| `/auth/refresh` | POST | No (uses cookie) | Get new access token |
| `/auth/logout` | POST | Yes | Revoke current session |
| `/auth/logout-all` | POST | Yes | Revoke all sessions |
| `/auth/forgot-password` | POST | No | Request password reset |
| `/auth/reset-password` | POST | No | Reset with token |
| `/auth/verify-email` | GET | No | Verify email address |
| `/auth/resend-verification` | POST | Yes | Resend verification email |

---

## Testing Authentication

### cURL Examples

**Register:**
```bash
curl -X POST https://api.housingcollectives.eu/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "display_name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST https://api.housingcollectives.eu/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "testuser",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt
```

**Authenticated Request:**
```bash
curl https://api.housingcollectives.eu/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Refresh Token:**
```bash
curl -X POST https://api.housingcollectives.eu/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

**Logout:**
```bash
curl -X POST https://api.housingcollectives.eu/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies.txt
```

---

## Future Enhancements

1. **OAuth Integration**: Google, Apple, Facebook login
2. **MFA**: TOTP-based two-factor authentication
3. **Passkeys**: WebAuthn/FIDO2 support
4. **Session Management**: UI for viewing/revoking active sessions
5. **Device Trust**: Require email confirmation for new devices

---

## References

- [JWT Best Practices (RFC 8725)](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
