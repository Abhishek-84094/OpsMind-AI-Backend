# 🚀 Quick Start Guide - All Features

## Prerequisites
- Node.js installed
- MongoDB Atlas account
- Redis (Upstash) configured
- Gemini API key

## Installation

```bash
cd backend
npm install
```

## Environment Setup

```env
PORT=5000
MONGO_URI=mongodb+srv://...
GEMINI_API_KEY=...
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
REDIS_URL=rediss://default:password@host:port
```

## Start Server

```bash
npm run dev
```

---

## 🎯 Feature Usage Examples

### 1️⃣ Role-Based Access Control

**Create Admin User:**
```bash
POST /api/auth/register
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123"
}

# Then manually update role in DB:
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

**Update User Permissions:**
```bash
PUT /api/admin/user/:userId/role
Authorization: Bearer <admin_token>
{
  "role": "employee",
  "permissions": {
    "canUpload": true,
    "canQuery": true,
    "canViewAnalytics": false,
    "canManageUsers": false,
    "canDeleteDocuments": false
  }
}
```

---

### 2️⃣ Admin Analytics

**Get Overall Stats:**
```bash
GET /api/admin/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalQueries": 150,
      "totalDocuments": 25,
      "totalUsers": 10,
      "totalChunks": 5000,
      "avgResponseTime": 1250
    },
    "topQuestions": [...],
    "queriesByUser": [...],
    "documentStats": [...],
    "userActivity": [...]
  }
}
```

**Get User Analytics:**
```bash
GET /api/admin/user/:userId
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "queryCount": 45,
    "avgResponseTime": 1100,
    "topQuestions": [...],
    "documentAccess": [...]
  }
}
```

---

### 3️⃣ Background Embedding Queue

**Upload Document (Auto-queued):**
```bash
POST /api/upload
Authorization: Bearer <user_token>
Content-Type: multipart/form-data

file: <pdf_file>

Response:
{
  "success": true,
  "message": "Document uploaded successfully. Embeddings processing in background.",
  "status": "processing",
  "chunksCreated": 45
}
```

**Monitor Queue Status:**
- Check Redis for queue jobs
- Monitor worker logs in console
- Document status updates to "completed" when done

---

### 4️⃣ Document-Level Filtering

**List Accessible Documents:**
```bash
GET /api/documents
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "doc_id",
      "fileName": "document.pdf",
      "uploadedBy": { "name": "User", "email": "user@example.com" },
      "totalPages": 10,
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Grant Document Access:**
```bash
POST /api/admin/access/grant
Authorization: Bearer <admin_token>
{
  "userId": "user_id",
  "documentId": "doc_id"
}
```

**Query Specific Documents:**
```bash
POST /api/query/ask
Authorization: Bearer <user_token>
{
  "question": "What is the main topic?",
  "documentIds": ["doc_id_1", "doc_id_2"]
}
```

**Share Document with Users:**
```bash
POST /api/documents/:documentId/share
Authorization: Bearer <user_token>
{
  "userIds": ["user_id_1", "user_id_2"]
}
```

---

### 5️⃣ Streaming AI Responses

**Regular Response (Existing):**
```bash
POST /api/query/ask
Authorization: Bearer <user_token>
{
  "question": "What is this document about?"
}

Response:
{
  "success": true,
  "question": "What is this document about?",
  "answer": "The document discusses...",
  "sources": [...],
  "responseTime": 1250
}
```

**Streaming Response (NEW):**
```bash
POST /api/query/ask-stream
Authorization: Bearer <user_token>
{
  "question": "What is this document about?",
  "documentIds": ["optional_doc_id"]
}

Response (Server-Sent Events):
data: {"text": "The document discusses"}
data: {"text": " various topics including"}
data: {"text": " AI and machine learning"}
data: {"done": true}
```

**Frontend Implementation:**
```javascript
async function streamQuery(question, documentIds = []) {
  const response = await fetch('/api/query/ask-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ question, documentIds })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.done) {
          console.log('Stream complete:', fullAnswer);
        } else {
          fullAnswer += data.text;
          console.log('Streaming:', data.text);
        }
      }
    }
  }
}
```

---

## 📊 Complete API Reference

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
```

### Queries
```
POST   /api/query/ask
POST   /api/query/ask-stream
```

### Documents
```
GET    /api/documents
GET    /api/documents/:documentId
DELETE /api/documents/:documentId
POST   /api/documents/:documentId/share
```

### Upload
```
POST   /api/upload
```

### Admin
```
GET    /api/admin/stats
GET    /api/admin/user/:userId
GET    /api/admin/document/:documentId
GET    /api/admin/users
PUT    /api/admin/user/:userId/role
POST   /api/admin/access/grant
POST   /api/admin/access/revoke
```

---

## 🔍 Testing Checklist

- [ ] User registration & login
- [ ] Upload PDF document
- [ ] Check background embedding queue
- [ ] Query with document filter
- [ ] Test streaming response
- [ ] Admin analytics endpoints
- [ ] Grant/revoke document access
- [ ] Role-based access control
- [ ] Permission-based access control

---

## 🐛 Troubleshooting

**Redis Connection Error:**
- Check REDIS_URL in .env
- Verify Upstash credentials
- Ensure IP whitelist allows your connection

**Embedding Queue Not Processing:**
- Check Redis connection
- Verify BullMQ worker is running
- Check console logs for errors

**Document Not Accessible:**
- Verify user has access via `accessibleDocuments`
- Check admin granted access
- Verify document exists

**Streaming Not Working:**
- Check browser supports EventSource
- Verify Authorization header
- Check network tab for SSE connection

---

## 📚 Documentation

- `FEATURES.md` - Detailed feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details

---

**All features are ready to use! 🎉**
