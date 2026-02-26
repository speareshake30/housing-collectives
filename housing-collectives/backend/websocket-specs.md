# WebSocket Implementation Guide
## European Housing Collectives Community

**Protocol:** WebSocket (wss://)  
**Authentication:** JWT via connection message  
**Heartbeat:** 30s ping/pong

---

## Connection

### Client Connection

```javascript
const ws = new WebSocket('wss://api.housingcollectives.eu/v1/ws');

ws.onopen = () => {
  // Authenticate immediately after connection
  ws.send(JSON.stringify({
    type: 'auth',
    token: accessToken // JWT access token
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};

ws.onclose = (event) => {
  if (event.code === 1008) {
    // Policy violation - likely auth failed
    console.error('Authentication failed');
  }
  // Attempt reconnection with exponential backoff
  reconnect();
};

// Heartbeat
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

### Server Implementation (Node.js + ws)

```javascript
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/v1/ws' });
    this.clients = new Map(); // userId -> Set of connections
    this.conversationClients = new Map(); // conversationId -> Set of connections
    
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, req) {
    ws.isAlive = true;
    ws.authenticated = false;
    ws.user = null;
    ws.subscriptions = new Set();

    ws.on('pong', () => { ws.isAlive = true; });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this.handleMessage(ws, message);
      } catch (err) {
        this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.cleanupConnection(ws);
    });

    // Auth timeout - close if not authenticated within 10s
    setTimeout(() => {
      if (!ws.authenticated && ws.readyState === WebSocket.OPEN) {
        ws.close(1008, 'Authentication timeout');
      }
    }, 10000);
  }

  async handleMessage(ws, message) {
    const { type, data, id } = message;

    switch (type) {
      case 'auth':
        await this.handleAuth(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'message.send':
        await this.handleSendMessage(ws, data, id);
        break;
      case 'message.typing':
        await this.handleTyping(ws, data);
        break;
      case 'message.read':
        await this.handleReadReceipt(ws, data);
        break;
      case 'conversation.subscribe':
        await this.handleSubscribeConversation(ws, data);
        break;
      case 'conversation.unsubscribe':
        await this.handleUnsubscribeConversation(ws, data);
        break;
      case 'presence.update':
        await this.handlePresenceUpdate(ws, data);
        break;
      default:
        this.sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${type}`);
    }
  }

  async handleAuth(ws, { token }) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY);
      ws.authenticated = true;
      ws.user = decoded;
      
      // Track connection by user
      if (!this.clients.has(decoded.sub)) {
        this.clients.set(decoded.sub, new Set());
      }
      this.clients.get(decoded.sub).add(ws);
      
      ws.send(JSON.stringify({
        type: 'auth.success',
        data: { user_id: decoded.sub }
      }));
      
      // Broadcast online status to friends/connections
      this.broadcastPresence(decoded.sub, 'online');
      
    } catch (err) {
      ws.close(1008, 'Authentication failed');
    }
  }

  async handleSendMessage(ws, data, tempId) {
    if (!ws.authenticated) {
      return this.sendError(ws, 'UNAUTHORIZED', 'Not authenticated');
    }

    const { conversation_id, content, content_type = 'text', reply_to_id, attachments = [] } = data;

    try {
      // Validate user is participant
      const isParticipant = await db.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversation_id, ws.user.sub]
      );

      if (!isParticipant.rows[0]) {
        return this.sendError(ws, 'FORBIDDEN', 'Not a conversation participant');
      }

      // Save message to database
      const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type, reply_to_id, attachments)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [conversation_id, ws.user.sub, content, content_type, reply_to_id, JSON.stringify(attachments)]
      );

      const message = result.rows[0];
      
      // Fetch sender info
      const senderResult = await db.query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
        [ws.user.sub]
      );
      
      const fullMessage = {
        ...message,
        sender: senderResult.rows[0]
      };

      // Broadcast to conversation subscribers
      this.broadcastToConversation(conversation_id, {
        type: 'message.new',
        data: { message: fullMessage }
      }, ws); // Exclude sender

      // Confirm to sender
      ws.send(JSON.stringify({
        type: 'message.sent',
        data: { message: fullMessage, temp_id: tempId }
      }));

      // Create notifications for offline participants
      await this.createMessageNotifications(conversation_id, message, ws.user.sub);

    } catch (err) {
      console.error('Error sending message:', err);
      this.sendError(ws, 'INTERNAL_ERROR', 'Failed to send message');
    }
  }

  async handleTyping(ws, { conversation_id, is_typing }) {
    if (!ws.authenticated) return;

    this.broadcastToConversation(conversation_id, {
      type: 'message.typing',
      data: {
        conversation_id,
        user: {
          id: ws.user.sub,
          username: ws.user.username,
          display_name: ws.user.display_name
        },
        is_typing
      }
    }, ws);
  }

  async handleReadReceipt(ws, { conversation_id, message_id }) {
    if (!ws.authenticated) return;

    // Update last_read for participant
    await db.query(
      `UPDATE conversation_participants 
       SET last_read_at = NOW(), last_read_message_id = $1
       WHERE conversation_id = $2 AND user_id = $3`,
      [message_id, conversation_id, ws.user.sub]
    );

    // Create read receipt record
    await db.query(
      `INSERT INTO message_read_receipts (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [message_id, ws.user.sub]
    );

    // Broadcast to conversation
    this.broadcastToConversation(conversation_id, {
      type: 'message.read',
      data: {
        conversation_id,
        user_id: ws.user.sub,
        message_id,
        read_at: new Date().toISOString()
      }
    }, ws);
  }

  async handleSubscribeConversation(ws, { conversation_id }) {
    if (!ws.authenticated) return;

    // Verify membership
    const member = await db.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversation_id, ws.user.sub]
    );

    if (!member.rows[0]) {
      return this.sendError(ws, 'FORBIDDEN', 'Not a conversation participant');
    }

    ws.subscriptions.add(conversation_id);
    
    if (!this.conversationClients.has(conversation_id)) {
      this.conversationClients.set(conversation_id, new Set());
    }
    this.conversationClients.get(conversation_id).add(ws);

    ws.send(JSON.stringify({
      type: 'conversation.subscribed',
      data: { conversation_id }
    }));
  }

  handleUnsubscribeConversation(ws, { conversation_id }) {
    ws.subscriptions.delete(conversation_id);
    
    const clients = this.conversationClients.get(conversation_id);
    if (clients) {
      clients.delete(ws);
    }

    ws.send(JSON.stringify({
      type: 'conversation.unsubscribed',
      data: { conversation_id }
    }));
  }

  broadcastToConversation(conversation_id, message, excludeWs = null) {
    const clients = this.conversationClients.get(conversation_id);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  broadcastToUser(user_id, message) {
    const clients = this.clients.get(user_id);
    if (!clients) return;

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  broadcastPresence(user_id, status) {
    // Broadcast to relevant users (friends, conversation partners)
    // Implementation depends on your presence requirements
  }

  cleanupConnection(ws) {
    if (ws.user) {
      // Remove from user connections
      const userClients = this.clients.get(ws.user.sub);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.user.sub);
          // User went offline
          this.broadcastPresence(ws.user.sub, 'offline');
        }
      }
    }

    // Remove from conversation subscriptions
    ws.subscriptions.forEach(conversation_id => {
      const clients = this.conversationClients.get(conversation_id);
      if (clients) {
        clients.delete(ws);
      }
    });
  }

  sendError(ws, code, message) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { code, message }
    }));
  }

  // Heartbeat check
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }
}

module.exports = WebSocketServer;
```

---

## Message Protocol

### Client → Server

| Type | Description | Required Auth |
|------|-------------|---------------|
| `auth` | Authenticate with JWT | No |
| `ping` | Keepalive ping | No |
| `message.send` | Send chat message | Yes |
| `message.typing` | Typing indicator | Yes |
| `message.read` | Mark as read | Yes |
| `conversation.subscribe` | Subscribe to conversation events | Yes |
| `conversation.unsubscribe` | Unsubscribe from conversation | Yes |
| `presence.update` | Update online status | Yes |

### Server → Client

| Type | Description |
|------|-------------|
| `auth.success` | Authentication confirmed |
| `auth.error` | Authentication failed |
| `pong` | Keepalive response |
| `message.new` | New message received |
| `message.sent` | Message sent confirmation |
| `message.typing` | User typing indicator |
| `message.read` | Read receipt |
| `notification.new` | New notification |
| `presence.update` | User presence changed |
| `conversation.subscribed` | Subscription confirmed |
| `conversation.unsubscribe` | Unsubscription confirmed |
| `error` | Error message |

---

## Message Schemas

### Authentication
```json
{
  "type": "auth",
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIs..."
  }
}
```

### Send Message
```json
{
  "type": "message.send",
  "id": "client-generated-id",  // For correlation
  "data": {
    "conversation_id": "uuid",
    "content": "Hello!",
    "content_type": "text",
    "reply_to_id": null,
    "attachments": []
  }
}
```

### Message Confirmation
```json
{
  "type": "message.sent",
  "data": {
    "temp_id": "client-generated-id",
    "message": {
      "id": "server-uuid",
      "conversation_id": "uuid",
      "sender": {
        "id": "uuid",
        "username": "treehugger_42",
        "display_name": "Alex",
        "avatar_url": "https://..."
      },
      "content": "Hello!",
      "content_type": "text",
      "created_at": "2024-02-20T18:30:00Z"
    }
  }
}
```

### Receive Message
```json
{
  "type": "message.new",
  "data": {
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender": { /* ... */ },
      "content": "Hey there!",
      "content_type": "text",
      "created_at": "2024-02-20T18:30:00Z"
    }
  }
}
```

---

## Scaling Considerations

For production with multiple server instances:

### Redis Pub/Sub

```javascript
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

// Subscribe to Redis channels
sub.subscribe('messages', 'notifications', 'presence');

sub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  
  if (channel === 'messages') {
    // Broadcast to local subscribers
    wss.broadcastToConversation(data.conversation_id, data.payload);
  }
});

// Publish message to Redis
async function publishMessage(conversation_id, payload) {
  await pub.publish('messages', JSON.stringify({
    conversation_id,
    payload
  }));
}
```

### Architecture with Redis

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client 1│     │ Client 2│     │ Client 3│
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     ▼               ▼               ▼
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Server 1│◀───▶│  Redis  │◀───▶│ Server 2│
│  (WS)   │     │ Pub/Sub │     │  (WS)   │
└────┬────┘     └─────────┘     └────┬────┘
     │                               │
     └───────────┬───────────────────┘
                 ▼
           ┌─────────┐
           │PostgreSQL│
           └─────────┘
```

---

## Error Handling

### Connection Errors

| Code | Description | Action |
|------|-------------|--------|
| `1000` | Normal closure | Reconnect optional |
| `1006` | Abnormal closure | Reconnect immediately |
| `1008` | Policy violation | Check auth, don't retry |
| `1011` | Server error | Reconnect with backoff |

### Client Reconnection Strategy

```javascript
class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      maxReconnectDelay: 30000,
      minReconnectDelay: 1000,
      reconnectDecay: 1.5,
      ...options
    };
    this.reconnectAttempts = 0;
    this.token = options.token;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.authenticate();
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000 && event.code !== 1008) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  reconnect() {
    const delay = Math.min(
      this.options.minReconnectDelay * Math.pow(
        this.options.reconnectDecay,
        this.reconnectAttempts
      ),
      this.options.maxReconnectDelay
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  authenticate() {
    this.send({
      type: 'auth',
      data: { token: this.token }
    });
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

---

## Rate Limiting

### WebSocket Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Messages per user | 60 | 1 minute |
| Typing events | 30 | 1 minute |
| Connection attempts | 5 | 1 minute |
| Subscriptions | 100 | per connection |

```javascript
const rateLimiter = new Map(); // user_id -> { count, resetTime }

function checkRateLimit(userId, action, limit, windowMs) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const record = rateLimiter.get(key);

  if (!record || now > record.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

---

## Monitoring

### Metrics to Track

- Connection count (total and per user)
- Message throughput (messages/sec)
- Latency (message delivery time)
- Error rates
- Reconnection frequency
- Subscription counts

```javascript
// Prometheus metrics example
const metrics = {
  connections: new Gauge('websocket_connections_total'),
  messagesSent: new Counter('websocket_messages_sent_total'),
  messagesReceived: new Counter('websocket_messages_received_total'),
  latency: new Histogram('websocket_message_latency_seconds')
};
```
