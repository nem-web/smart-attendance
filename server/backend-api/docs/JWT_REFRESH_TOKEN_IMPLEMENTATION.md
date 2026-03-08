# JWT Refresh Token and Token Revocation Implementation

## Overview

This implementation adds secure JWT refresh token functionality with proper token revocation capabilities to the Smart Attendance System.

## Key Features

### 1. Dual Token System
- **Access Token**: Short-lived (15 minutes), used for API authentication
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### 2. Secure Token Storage
- Refresh tokens are hashed using SHA-256 before storage in MongoDB
- Only token hashes are stored, never plaintext tokens
- Tokens are associated with user sessions for tracking

### 3. Token Revocation
- Tokens can be revoked on logout
- Revoked tokens cannot be used to obtain new access tokens
- Session-based revocation ensures all tokens for a session are invalidated

### 4. Automatic Cleanup
- TTL index on `refresh_tokens.expires_at` automatically removes expired tokens
- MongoDB handles cleanup without manual intervention

### 5. Security Enforcement
- `JWT_SECRET` environment variable is now required
- Application fails to start if `JWT_SECRET` is not set
- Removes hardcoded fallback secrets

## Database Schema

### refresh_tokens Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  token_hash: String,
  session_id: String,
  created_at: DateTime,
  expires_at: DateTime,
  revoked: Boolean
}
```

### Indexes

1. **TTL Index**: `expires_at` (expireAfterSeconds: 0)
2. **Compound Index**: `(user_id, session_id)`
3. **Unique Index**: `token_hash`

## API Endpoints

### POST /auth/login
Returns both access and refresh tokens on successful authentication.

**Response:**
```json
{
  "user_id": "string",
  "email": "string",
  "role": "string",
  "name": "string",
  "college_name": "string",
  "token": "access_token",
  "refresh_token": "refresh_token"
}
```

### POST /auth/refresh-token
Exchanges a valid refresh token for new access and refresh tokens.

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response:**
```json
{
  "user_id": "string",
  "email": "string",
  "role": "string",
  "name": "string",
  "college_name": "string",
  "token": "new_access_token",
  "refresh_token": "new_refresh_token"
}
```

**Error Responses:**
- `401`: Invalid or revoked refresh token
- `401`: Refresh token expired
- `401`: Session conflict (logged in on another device)

### POST /auth/logout
Revokes all refresh tokens for the current session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Token Lifecycle

1. **Login**: User logs in → System generates access + refresh tokens → Refresh token hash stored in DB
2. **API Requests**: Client uses access token for authentication
3. **Token Refresh**: Access token expires → Client sends refresh token → System validates → New tokens issued → Old refresh token revoked
4. **Logout**: User logs out → All refresh tokens for session revoked → Tokens cannot be used

## Security Considerations

### Token Rotation
- Each refresh operation generates a new refresh token
- Old refresh token is immediately revoked
- Prevents token reuse attacks

### Session Management
- Tokens are tied to sessions
- Logging in on a new device invalidates previous session tokens
- Prevents concurrent session abuse

### Brute Force Protection
- Rate limiting on refresh endpoint (5 requests/minute)
- Failed refresh attempts are logged
- Expired tokens are automatically revoked

## Environment Variables

### Required
```env
JWT_SECRET=your-secret-key-here
```

### Optional
```env
JWT_ALGORITHM=HS256
```

## Migration Guide

### For Existing Deployments

1. **Set JWT_SECRET**:
   ```bash
   export JWT_SECRET=$(openssl rand -hex 32)
   ```

2. **Update .env file**:
   ```env
   JWT_SECRET=<generated-secret>
   ```

3. **Restart Application**:
   - Indexes will be created automatically on startup
   - Existing sessions will continue to work
   - New logins will use the refresh token system

### For Development

1. **Generate a secret**:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Add to .env**:
   ```env
   JWT_SECRET=<generated-secret>
   ```

## Testing

### Unit Tests
```bash
pytest tests/test_jwt_refresh_tokens.py -v
```

### Integration Tests
```bash
pytest tests/test_auth_refresh_revocation.py -v
```

### Manual Testing

1. **Login**:
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

2. **Refresh Token**:
   ```bash
   curl -X POST http://localhost:8000/auth/refresh-token \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"<refresh_token>"}'
   ```

3. **Logout**:
   ```bash
   curl -X POST http://localhost:8000/auth/logout \
     -H "Authorization: Bearer <access_token>"
   ```

## Monitoring

### Database Queries

**Check active refresh tokens**:
```javascript
db.refresh_tokens.find({ revoked: false }).count()
```

**Check expired tokens**:
```javascript
db.refresh_tokens.find({ 
  expires_at: { $lt: new Date() },
  revoked: false 
}).count()
```

**Check tokens for a user**:
```javascript
db.refresh_tokens.find({ 
  user_id: ObjectId("user_id_here") 
})
```

## Troubleshooting

### Application won't start
- **Error**: "JWT_SECRET environment variable is not set"
- **Solution**: Set `JWT_SECRET` in your environment or .env file

### Refresh token fails
- **Error**: "Invalid or revoked refresh token"
- **Causes**:
  - Token was already used (rotation)
  - User logged out
  - Token expired
  - User logged in on another device

### Session conflicts
- **Error**: "SESSION_CONFLICT: You have been logged out..."
- **Cause**: User logged in on another device
- **Solution**: User needs to log in again on current device

## Performance Considerations

- Refresh token validation requires one database query
- TTL index cleanup runs in background
- Token hashing is computationally inexpensive (SHA-256)
- Compound indexes optimize session lookups

## Future Enhancements

- Token blacklisting for immediate revocation
- Refresh token families for better tracking
- Device fingerprinting for enhanced security
- Refresh token usage analytics
