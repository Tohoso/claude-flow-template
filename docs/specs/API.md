# API Specification

> **SPARC Methodology - Specification Phase (API Details)**

## 1. Overview

### 1.1. Base URL

```
Production: https://api.example.com/v1
Staging:    https://staging-api.example.com/v1
```

### 1.2. Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer <token>
```

### 1.3. Response Format

All responses are in JSON format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

### 1.4. Error Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

---

## 2. Endpoints

### 2.1. Resource Name

#### GET /resource

Retrieves a list of resources.

**Query Parameters:**

| Parameter | Type | Required | Description |
|:---|:---|:---:|:---|
| `limit` | integer | No | Maximum number of results (default: 20) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "createdAt": "timestamp"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

#### POST /resource

Creates a new resource.

**Request Body:**

```json
{
  "name": "string",
  "description": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "createdAt": "timestamp"
  }
}
```

---

## 3. Error Codes

| Code | HTTP Status | Description |
|:---|:---:|:---|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 4. Rate Limiting

- **Rate Limit**: 100 requests per minute
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the window resets

---

## 5. Versioning

The API uses URL versioning. The current version is `v1`.

Breaking changes will result in a new version (e.g., `v2`).

---

*Last Updated: ${DATE}*
