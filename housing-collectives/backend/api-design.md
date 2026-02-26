# API Design Document
## European Housing Collectives Community

**Version:** 1.0  
**Base URL:** `https://api.housingcollectives.eu/v1`  
**Date:** 2024

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Collectives](#collectives)
4. [Roommate Ads](#roommate-ads)
5. [Events](#events)
6. [Messaging](#messaging)
7. [Notifications](#notifications)
8. [Files](#files)
9. [WebSocket Events](#websocket-events)

---

## Authentication

### POST /auth/register
Register a new user with Reddit-style username.

**Request:**
```json
{
  "username": "treehugger_42",
  "email": "user@example.com",
  "password": "securePassword123!",
  "display_name": "Alex"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "username": "treehugger_42",
    "email": "user@example.com",
    "display_name": "Alex",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expires_in": 3600
  }
}
```

**Errors:**
- `409` - Username or email already exists
- `400` - Invalid username format (must be 3-30 chars, alphanumeric + _ -)

---

### POST /auth/login
Authenticate existing user.

**Request:**
```json
{
  "username_or_email": "treehugger_42",
  "password": "securePassword123!"
}
```

**Response (200):** Same as register

**Errors:**
- `401` - Invalid credentials
- `403` - Email not verified

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

### POST /auth/logout
Revoke current refresh token.

**Headers:** `Authorization: Bearer <access_token>`

**Request:**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (204):** No content

---

### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):** Always returns success (prevents email enumeration)

---

### POST /auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "new_password": "newSecurePassword123!"
}
```

**Response (200):** Success

---

## Users

### GET /users/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "username": "treehugger_42",
  "email": "user@example.com",
  "display_name": "Alex",
  "bio": "Living in community since 2020",
  "avatar_url": "https://cdn.housingcollectives.eu/avatars/uuid.jpg",
  "location": {
    "lat": 52.5200,
    "lng": 13.4050,
    "city": "Berlin",
    "country": "DE"
  },
  "location_visible": true,
  "preferred_language": "en",
  "collectives": [
    {
      "id": "uuid",
      "name": "Sunshine Collective",
      "slug": "sunshine-collective",
      "role": "member"
    }
  ],
  "stats": {
    "events_attended": 12,
    "messages_sent": 456,
    "ads_posted": 2
  },
  "created_at": "2024-01-15T10:30:00Z",
  "last_login_at": "2024-02-20T18:45:00Z"
}
```

---

### PATCH /users/me
Update current user profile.

**Request:**
```json
{
  "display_name": "Alex Johnson",
  "bio": "Updated bio text",
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "location_visible": true,
  "preferred_language": "en",
  "notification_preferences": {
    "email": true,
    "push": true,
    "message_notifications": true,
    "event_reminders": true
  }
}
```

**Response (200):** Updated user object

---

### POST /users/me/avatar
Upload avatar image.

**Content-Type:** `multipart/form-data`

**Request:**
- `avatar`: File (jpg, png, webp, max 5MB)

**Response (200):**
```json
{
  "avatar_url": "https://cdn.housingcollectives.eu/avatars/uuid.jpg"
}
```

---

### GET /users/:username
Get public profile by username.

**Response (200):**
```json
{
  "id": "uuid",
  "username": "treehugger_42",
  "display_name": "Alex",
  "bio": "Living in community since 2020",
  "avatar_url": "https://cdn.housingcollectives.eu/avatars/uuid.jpg",
  "location": {
    "city": "Berlin",
    "country": "DE"
  },  -- Only city/country if location_visible
  "collectives": [
    {
      "id": "uuid",
      "name": "Sunshine Collective",
      "slug": "sunshine-collective",
      "role": "member"
    }
  ],
  "stats": {
    "events_attended": 12,
    "ads_posted": 2
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### GET /users/:username/ads
Get public ads posted by user.

**Query params:**
- `status` (optional): 'active', 'filled', 'all'
- `page`, `limit`

**Response (200):** Array of room ads

---

## Collectives

### GET /collectives
List collectives with filtering.

**Query params:**
- `lat`, `lng`, `radius` (km) - Geo search
- `country` - ISO code
- `city`
- `accepting_members` (boolean)
- `q` - Search query
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "sunshine-collective",
      "name": "Sunshine Collective",
      "description": "A vibrant community in Berlin...",
      "location": {
        "lat": 52.5200,
        "lng": 13.4050,
        "city": "Berlin",
        "country": "DE"
      },
      "cover_image_url": "https://cdn...",
      "member_count": 12,
      "capacity": 15,
      "accepting_members": true,
      "founded_at": "2020-03-15",
      "distance_km": 2.5  -- If geo search used
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "has_more": true
  }
}
```

---

### POST /collectives
Create a new collective.

**Request:**
```json
{
  "slug": "sunshine-collective",
  "name": "Sunshine Collective",
  "description": "A vibrant community in Berlin focused on sustainability...",
  "location": {
    "lat": 52.5200,
    "lng": 13.4050,
    "address": "123 Sunshine Street, Berlin",
    "city": "Berlin",
    "country": "DE"
  },
  "founded_at": "2020-03-15",
  "capacity": 15,
  "website_url": "https://sunshine-collective.example.com",
  "contact_email": "hello@sunshine-collective.example.com",
  "is_public": true,
  "accepting_members": true,
  "application_required": true
}
```

**Response (201):** Created collective object

---

### GET /collectives/:slug
Get collective details.

**Response (200):**
```json
{
  "id": "uuid",
  "slug": "sunshine-collective",
  "name": "Sunshine Collective",
  "description": "A vibrant community...",
  "location": {
    "lat": 52.5200,
    "lng": 13.4050,
    "address": "123 Sunshine Street",
    "city": "Berlin",
    "country": "DE"
  },
  "founded_at": "2020-03-15",
  "capacity": 15,
  "current_residents": 12,
  "member_count": 12,
  "website_url": "https://...",
  "contact_email": "hello@...",
  "cover_image_url": "https://cdn...",
  "gallery_images": [...],
  "is_public": true,
  "accepting_members": true,
  "application_required": true,
  "created_at": "2024-01-15T10:30:00Z",
  "is_member": false,  -- If authenticated
  "user_role": null  -- If authenticated
}
```

---

### PATCH /collectives/:slug
Update collective (admin only).

**Request:** Partial collective object

**Response (200):** Updated collective

---

### GET /collectives/:slug/members
List collective members.

**Query params:**
- `role` - Filter by role
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "user": {
        "id": "uuid",
        "username": "treehugger_42",
        "display_name": "Alex",
        "avatar_url": "https://..."
      },
      "role": "admin",
      "joined_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### POST /collectives/:slug/join
Apply to join or join collective.

**Request:**
```json
{
  "message": "I'd love to join your collective! I have experience with..."
}
```

**Response (201):** Application created or membership created

---

### POST /collectives/:slug/leave
Leave collective.

**Response (204):** No content

---

### POST /collectives/:slug/members/:user_id/role
Update member role (admin only).

**Request:**
```json
{
  "role": "admin"  -- or "member"
}
```

**Response (200):** Updated membership

---

### GET /collectives/:slug/documents
List collective documents.

**Response (200):** Array of documents

---

### POST /collectives/:slug/documents
Create document (members only).

**Request:**
```json
{
  "title": "Community Guidelines",
  "content": "# Welcome to our collective...",
  "document_type": "rules",
  "is_public": true
}
```

**Response (201):** Created document

---

## Roommate Ads

### GET /room-ads
List roommate ads with filtering.

**Query params:**
- `type` - 'seeking_roommate' or 'offering_room'
- `lat`, `lng`, `radius` - Geo search
- `country`, `city`
- `min_rent`, `max_rent`
- `move_in_date_from`, `move_in_date_to`
- `collective_id` - Filter by collective
- `q` - Search in title/description
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "offering_room",
      "title": "Sunny room in Berlin collective",
      "description": "We have a room available...",
      "posted_by": {
        "id": "uuid",
        "username": "treehugger_42",
        "display_name": "Alex",
        "avatar_url": "https://..."
      },
      "collective": {
        "id": "uuid",
        "name": "Sunshine Collective",
        "slug": "sunshine-collective"
      },
      "location": {
        "lat": 52.5200,
        "lng": 13.4050,
        "city": "Berlin",
        "country": "DE"
      },
      "monthly_rent": 450.00,
      "move_in_date": "2024-03-01",
      "duration_months": null,
      "images": [...],
      "status": "active",
      "view_count": 156,
      "application_count": 8,
      "created_at": "2024-02-15T10:30:00Z",
      "distance_km": 3.2
    }
  ],
  "pagination": {...}
}
```

---

### POST /room-ads
Create a new roommate ad.

**Request:**
```json
{
  "type": "offering_room",
  "title": "Sunny room in Berlin collective",
  "description": "We have a beautiful room available...",
  "collective_id": "uuid",  -- Optional
  "location": {
    "lat": 52.5200,
    "lng": 13.4050,
    "address": "123 Sunshine Street, Berlin",
    "city": "Berlin",
    "country": "DE"
  },
  "is_location_public": true,
  "monthly_rent": 450.00,
  "move_in_date": "2024-03-01",
  "duration_months": null,
  "preferred_gender": "any",  -- or 'male', 'female', 'non-binary'
  "dietary_restrictions": "Vegetarian preferred",
  "lifestyle_preferences": {
    "smoking": "no",
    "pets": "yes",
    "quiet_hours": "22:00-08:00"
  },
  "images": ["uuid1", "uuid2"],  -- File upload UUIDs
  "expires_at": "2024-03-15T00:00:00Z"
}
```

**Response (201):** Created ad object

---

### GET /room-ads/:id
Get single ad details.

**Response (200):** Full ad object with applications (if owner)

---

### PATCH /room-ads/:id
Update ad (owner only).

**Request:** Partial ad object

**Response (200):** Updated ad

---

### DELETE /room-ads/:id
Delete ad (owner only).

**Response (204):** No content

---

### POST /room-ads/:id/apply
Apply to a room ad.

**Request:**
```json
{
  "message": "Hi! I'm interested in the room. I'm a software developer...",
  "contact_info": "Feel free to email me at..."
}
```

**Response (201):** Application created

---

### GET /room-ads/:id/applications
List applications to an ad (owner only).

**Response (200):** Array of applications with applicant info

---

### POST /room-ads/applications/:id/respond
Respond to an application (ad owner only).

**Request:**
```json
{
  "status": "accepted",  -- or "rejected"
  "response_message": "We'd love to meet you! Can you come by next Tuesday?"
}
```

**Response (200):** Updated application

---

## Events

### GET /events
List events with filtering.

**Query params:**
- `visibility` - 'public', 'collective_only'
- `collective_id` - Filter by collective
- `lat`, `lng`, `radius` - Geo search
- `from`, `to` - Date range
- `attending` (boolean) - Only events user is attending
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Community Dinner",
      "description": "Monthly potluck dinner...",
      "created_by": {
        "id": "uuid",
        "username": "treehugger_42",
        "display_name": "Alex",
        "avatar_url": "https://..."
      },
      "collective": {
        "id": "uuid",
        "name": "Sunshine Collective",
        "slug": "sunshine-collective"
      },
      "start_at": "2024-03-15T18:00:00Z",
      "end_at": "2024-03-15T22:00:00Z",
      "timezone": "Europe/Berlin",
      "location_name": "Sunshine Collective Garden",
      "location_address": "123 Sunshine Street, Berlin",
      "location": {
        "lat": 52.5200,
        "lng": 13.4050
      },
      "is_online": false,
      "online_url": null,
      "visibility": "collective_only",
      "status": "published",
      "max_attendees": 50,
      "requires_approval": false,
      "cover_image_url": "https://cdn...",
      "attendee_count": 23,
      "is_attending": true,  -- If authenticated
      "user_rsvp": "going",  -- If authenticated
      "created_at": "2024-02-20T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### POST /events
Create a new event.

**Request:**
```json
{
  "title": "Community Dinner",
  "description": "Monthly potluck dinner...",
  "collective_id": "uuid",  -- Optional (null = global event)
  "start_at": "2024-03-15T18:00:00Z",
  "end_at": "2024-03-15T22:00:00Z",
  "timezone": "Europe/Berlin",
  "location_name": "Sunshine Collective Garden",
  "location_address": "123 Sunshine Street, Berlin",
  "location": {
    "lat": 52.5200,
    "lng": 13.4050
  },
  "is_online": false,
  "online_url": null,
  "visibility": "collective_only",  -- 'public', 'collective_only', 'invite_only'
  "max_attendees": 50,
  "requires_approval": false,
  "cover_image_url": "https://cdn..."
}
```

**Response (201):** Created event

---

### GET /events/:id
Get event details.

**Response (200):** Full event object with attendees list (if authorized)

---

### PATCH /events/:id
Update event (creator or collective admin only).

**Request:** Partial event object

**Response (200):** Updated event

---

### DELETE /events/:id
Delete event (creator or collective admin only).

**Response (204):** No content

---

### POST /events/:id/rsvp
RSVP to an event.

**Request:**
```json
{
  "status": "going",  -- 'going', 'maybe', 'not_going'
  "guests_count": 1,  -- Number of +1s
  "notes": "Bringing a salad!"
}
```

**Response (200):** Updated RSVP

---

### GET /events/:id/attendees
List event attendees.

**Query params:**
- `status` - Filter by RSVP status
- `page`, `limit`

**Response (200):** Array of attendees with user info

---

### GET /events/:id/comments
Get event comments.

**Response (200):** Nested comments thread

---

### POST /events/:id/comments
Post comment on event.

**Request:**
```json
{
  "content": "Looking forward to this!",
  "parent_id": "uuid"  -- Optional, for replies
}
```

**Response (201):** Created comment

---

## Messaging

### GET /conversations
List user's conversations.

**Query params:**
- `type` - 'direct', 'collective', or 'all'
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "direct",
      "title": null,
      "participants": [
        {
          "id": "uuid",
          "username": "forest_dweller",
          "display_name": "Sam",
          "avatar_url": "https://..."
        }
      ],
      "last_message": {
        "content": "Hey, are you coming to the dinner?",
        "created_at": "2024-02-20T18:30:00Z",
        "sender_username": "forest_dweller"
      },
      "unread_count": 3,
      "notifications_enabled": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### POST /conversations
Start a new conversation.

**Request:**
```json
{
  "type": "direct",
  "participant_usernames": ["forest_dweller"],  -- For direct, max 1
  "initial_message": "Hey! I saw your ad..."
}
```

Or for collective:
```json
{
  "type": "collective",
  "collective_id": "uuid",
  "initial_message": "Hello collective! I'm interested in joining..."
}
```

**Response (201):** Created conversation

---

### GET /conversations/:id
Get conversation details.

**Response (200):** Conversation object with participants

---

### GET /conversations/:id/messages
Get messages in conversation.

**Query params:**
- `before` - Message ID for pagination (older messages)
- `after` - Message ID for new messages
- `limit` - Default 50, max 100

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "sender": {
        "id": "uuid",
        "username": "forest_dweller",
        "display_name": "Sam",
        "avatar_url": "https://..."
      },
      "content": "Hey, are you coming to the dinner?",
      "content_type": "text",
      "reply_to": null,
      "attachments": [],
      "is_edited": false,
      "created_at": "2024-02-20T18:30:00Z",
      "read_by": [
        {
          "user_id": "uuid",
          "read_at": "2024-02-20T18:35:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "has_more": true,
    "oldest_id": "uuid"
  }
}
```

---

### POST /conversations/:id/messages
Send a message.

**Request:**
```json
{
  "content": "Yes, I'll be there!",
  "content_type": "text",
  "reply_to_id": "uuid",  -- Optional
  "attachments": ["file-uuid-1", "file-uuid-2"]  -- Optional
}
```

**Response (201):** Created message

---

### PATCH /conversations/:id/messages/:message_id
Edit a message (sender only, within 24h).

**Request:**
```json
{
  "content": "Updated message text"
}
```

**Response (200):** Updated message

---

### DELETE /conversations/:id/messages/:message_id
Delete a message (soft delete, sender only).

**Response (204):** No content

---

### POST /conversations/:id/typing
Send typing indicator (WebSocket fallback).

**Request:**
```json
{
  "is_typing": true
}
```

**Response (204):** No content

---

### POST /conversations/:id/read
Mark conversation as read.

**Request:**
```json
{
  "message_id": "uuid"  -- Optional, mark up to this message
}
```

**Response (200):** Updated read status

---

### POST /conversations/:id/participants
Add participants (collective conversations only, admin).

**Request:**
```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

**Response (200):** Updated participant list

---

### DELETE /conversations/:id/participants/:user_id
Remove participant (admin or self).

**Response (204):** No content

---

## Notifications

### GET /notifications
Get user notifications.

**Query params:**
- `unread_only` (boolean)
- `type` - Filter by type
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "message",
      "title": "New message from forest_dweller",
      "body": "Hey, are you coming to the dinner?",
      "entity_type": "message",
      "entity_id": "uuid",
      "action_url": "/conversations/uuid",
      "is_read": false,
      "created_at": "2024-02-20T18:30:00Z"
    }
  ],
  "pagination": {...},
  "unread_count": 5
}
```

---

### POST /notifications/:id/read
Mark notification as read.

**Response (200):** Updated notification

---

### POST /notifications/read-all
Mark all notifications as read.

**Response (200):** Success

---

### DELETE /notifications/:id
Delete notification.

**Response (204):** No content

---

### GET /notifications/preferences
Get notification preferences.

**Response (200):**
```json
{
  "email": true,
  "push": true,
  "message_notifications": true,
  "event_reminders": true,
  "collective_updates": true,
  "roommate_matches": true,
  "digest_frequency": "daily"  -- 'immediate', 'daily', 'weekly', 'never'
}
```

---

### PATCH /notifications/preferences
Update notification preferences.

**Request:** Partial preferences object

**Response (200):** Updated preferences

---

## Files

### POST /files/upload
Upload a file.

**Content-Type:** `multipart/form-data`

**Request:**
- `file`: File data
- `entity_type` (optional): 'user_avatar', 'collective_cover', 'message_attachment', 'room_ad_image'
- `entity_id` (optional): Related entity UUID

**Response (201):**
```json
{
  "id": "uuid",
  "original_filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "file_size": 2456789,
  "url": "https://cdn.housingcollectives.eu/files/uuid.jpg",
  "thumbnail_url": "https://cdn.housingcollectives.eu/files/uuid_thumb.jpg",
  "width": 1920,
  "height": 1080,
  "created_at": "2024-02-20T18:30:00Z"
}
```

---

### GET /files/:id
Get file info.

**Response (200):** File metadata

---

### DELETE /files/:id
Delete uploaded file (owner only).

**Response (204):** No content

---

## WebSocket Events

WebSocket endpoint: `wss://api.housingcollectives.eu/v1/ws`

### Connection

Connect with JWT token:
```javascript
const ws = new WebSocket('wss://api.housingcollectives.eu/v1/ws');

// After connection, authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'eyJhbGciOiJIUzI1NiIs...'
}));
```

### Incoming Events (Server → Client)

#### message.new
New message in a conversation.

```json
{
  "type": "message.new",
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender": {
        "id": "uuid",
        "username": "forest_dweller",
        "display_name": "Sam",
        "avatar_url": "https://..."
      },
      "content": "Hey, are you coming?",
      "content_type": "text",
      "attachments": [],
      "created_at": "2024-02-20T18:30:00Z"
    }
  }
}
```

#### message.typing
Typing indicator.

```json
{
  "type": "message.typing",
  "data": {
    "conversation_id": "uuid",
    "user": {
      "id": "uuid",
      "username": "forest_dweller",
      "display_name": "Sam"
    },
    "is_typing": true
  }
}
```

#### message.read
Read receipt.

```json
{
  "type": "message.read",
  "data": {
    "conversation_id": "uuid",
    "user_id": "uuid",
    "message_id": "uuid",
    "read_at": "2024-02-20T18:35:00Z"
  }
}
```

#### notification.new
New notification.

```json
{
  "type": "notification.new",
  "data": {
    "notification": {
      "id": "uuid",
      "type": "message",
      "title": "New message from forest_dweller",
      "body": "Hey, are you coming to the dinner?",
      "action_url": "/conversations/uuid",
      "created_at": "2024-02-20T18:30:00Z"
    },
    "unread_count": 5
  }
}
```

#### event.reminder
Event reminder.

```json
{
  "type": "event.reminder",
  "data": {
    "event": {
      "id": "uuid",
      "title": "Community Dinner",
      "start_at": "2024-03-15T18:00:00Z",
      "location_name": "Sunshine Collective Garden"
    },
    "minutes_until": 60
  }
}
```

### Outgoing Events (Client → Server)

#### message.send
Send a message.

```json
{
  "type": "message.send",
  "data": {
    "conversation_id": "uuid",
    "content": "Hello!",
    "content_type": "text",
    "reply_to_id": null,
    "attachments": []
  }
}
```

**Response:**
```json
{
  "type": "message.sent",
  "data": {
    "message": { /* full message object */ },
    "temp_id": "client-generated-id"  // If provided
  }
}
```

#### message.typing
Send typing indicator.

```json
{
  "type": "message.typing",
  "data": {
    "conversation_id": "uuid",
    "is_typing": true
  }
}
```

#### message.read
Mark messages as read.

```json
{
  "type": "message.read",
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid"  // Mark up to this message as read
  }
}
```

#### presence.update
Update online status.

```json
{
  "type": "presence.update",
  "data": {
    "status": "online"  // 'online', 'away', 'dnd', 'offline'
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "uuid-for-debugging"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Rate limits are applied per endpoint category:

| Category | Limit | Window |
|----------|-------|--------|
| Auth | 5 | 1 minute |
| General API | 100 | 1 minute |
| Messaging | 300 | 1 minute |
| File uploads | 10 | 1 minute |

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708453200
```

---

## Pagination

All list endpoints use cursor-based pagination for performance.

**Query params:**
- `cursor` - Opaque cursor string
- `limit` - Items per page (default 20, max 100)

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6...",
    "has_more": true,
    "total": 156  -- When available
  }
}
```

---

## Filtering & Search

### Common Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Full-text search |
| `lat`, `lng`, `radius` | float/int | Geo search (km) |
| `country` | string | ISO country code |
| `city` | string | City name |
| `created_after` | ISO date | Filter by creation |
| `created_before` | ISO date | Filter by creation |

### Sorting

Use `sort` parameter:
- `created_at:desc` (default)
- `created_at:asc`
- `distance:asc` (for geo search)
- `updated_at:desc`

---

## Caching

API responses use ETag-based caching:

**Request:**
```
GET /collectives/sunshine-collective
If-None-Match: "abc123"
```

**Response (304):** Not Modified (if content unchanged)

**Response (200):**
```
ETag: "abc123"
Cache-Control: private, max-age=60
```

---

## Content Security

- All user-generated content is sanitized (XSS protection)
- Images are processed and scanned
- File uploads are type-restricted and size-limited
- API uses CORS with strict origin policy
