# Rate Limiting

This document details the rate limiting (throttling) implementation in the Assessment Bot Backend API, including configuration, behaviour, and best practices for client applications.

## Overview

The API implements comprehensive rate limiting using the `@nestjs/throttler` module to protect against abuse and ensure fair resource allocation. Rate limiting is applied globally with different limits for authenticated and unauthenticated requests.

## Rate Limiting Architecture

### Global Protection

All API endpoints are protected by a global `ThrottlerGuard` that:

- Automatically applies to every route unless explicitly overridden
- Provides baseline protection against abuse
- Uses a sliding window approach for fair rate limiting

### Two-Tier System

The API uses different rate limits based on authentication status:

1. **Unauthenticated Routes**: Lower limits for public endpoints
2. **Authenticated Routes**: Higher limits for API key protected endpoints

## Configuration

### Environment Variables

Rate limiting behaviour is controlled by these environment variables:

| Variable                          | Default | Description                                        |
| --------------------------------- | ------- | -------------------------------------------------- |
| `THROTTLER_TTL`                   | `10000` | Time window in milliseconds (10 seconds)           |
| `UNAUTHENTICATED_THROTTLER_LIMIT` | `10`    | Max requests per window for unauthenticated routes |
| `AUTHENTICATED_THROTTLER_LIMIT`   | `90`    | Max requests per window for authenticated routes   |

### Default Configuration

```typescript
// Global (unauthenticated) throttler configuration
{
  ttl: 10000,  // 10 seconds
  limit: 10    // 10 requests per 10 seconds
}

// Authenticated throttler configuration
{
  ttl: 10000,  // 10 seconds
  limit: 90    // 90 requests per 10 seconds
}
```

## Rate Limit Application

### Unauthenticated Endpoints

These endpoints use the global rate limiting configuration:

| Endpoint      | Method | Limit  | Description         |
| ------------- | ------ | ------ | ------------------- |
| `/health`     | GET    | 10/10s | Health check        |
| `/`           | GET    | 10/10s | Hello world         |
| `/test-error` | GET    | 10/10s | Test error handling |

### Authenticated Endpoints

These endpoints override the global limits with higher thresholds:

| Endpoint       | Method | Limit  | Description           |
| -------------- | ------ | ------ | --------------------- |
| `/v1/assessor` | POST   | 90/10s | Create assessment     |
| `/check-auth`  | GET    | 90/10s | Verify authentication |

## Rate Limiting Behaviour

### Sliding Window

The rate limiter uses a sliding window approach:

- Tracks requests within the specified TTL window
- Resets counters as the window slides forward
- Provides smooth rate limiting without abrupt resets

### Request Tracking

Rate limits are tracked per:

- **IP Address**: For unauthenticated requests
- **API Key**: For authenticated requests (when implemented)

### Limit Enforcement

When rate limits are exceeded:

1. **HTTP 429**: Response returns "Too Many Requests" status
2. **Retry-After Header**: Indicates seconds until requests can resume
3. **Standard Error Format**: Follows the API's error response schema

## Rate Limit Response

### Success Response Headers

Successful requests may include rate limiting headers (implementation dependent):

```http
X-RateLimit-Limit: 90
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1641559200
```

### Rate Limited Response

When limits are exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 8
Content-Type: application/json

{
  "statusCode": 429,
  "timestamp": "2025-01-07T12:00:00.000Z",
  "path": "/v1/assessor",
  "message": "Too Many Requests"
}
```

#### Retry-After Header

The `Retry-After` header indicates:

- **Value**: Seconds to wait before making another request
- **Calculation**: Based on remaining TTL window time
- **Usage**: Clients should respect this value to avoid continued throttling

## Use Case Examples

### Classroom Assessment Scenario

The authenticated limit of 90 requests per 10 seconds is designed to support:

- **Class Size**: Up to 30 students
- **Assessment Types**: 3 different task types per activity
- **Concurrent Submissions**: All students submitting simultaneously
- **Calculation**: 30 students × 3 tasks = 90 requests

### API Integration Patterns

#### High-Volume Processing

```typescript
// Example: Batch processing with rate limit awareness
async function processAssessments(assessments: Assessment[]) {
  const results = [];
  let remainingRequests = 90; // Start of window

  for (const assessment of assessments) {
    if (remainingRequests <= 0) {
      // Wait for window reset
      await new Promise((resolve) => setTimeout(resolve, 10000));
      remainingRequests = 90;
    }

    try {
      const result = await submitAssessment(assessment);
      results.push(result);
      remainingRequests--;
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['retry-after'];
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        remainingRequests = 90; // Reset counter after wait
      }
    }
  }

  return results;
}
```

## Rate Limiting Override

### Controller-Level Configuration

Individual controllers can override global rate limits:

```typescript
@Controller('v1/assessor')
@UseGuards(ApiKeyGuard)
@Throttle(authenticatedThrottler) // Override global limits
export class AssessorController {
  // Controller methods use 90/10s instead of 10/10s
}
```

### Route-Level Configuration

Specific routes can have custom limits:

```typescript
@Post()
@Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 requests per minute
async create(@Body() data: CreateAssessorDto) {
  // Custom rate limit for this specific endpoint
}
```

## Client Implementation Guidelines

### Handling Rate Limits

#### Basic Error Handling

```typescript
async function makeRequest(url: string, data: any) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new RateLimitError(
        `Rate limited. Retry after ${retryAfter} seconds`,
      );
    }

    return response.json();
  } catch (error) {
    // Handle other errors
    throw error;
  }
}
```

#### Exponential Backoff

```typescript
async function makeRequestWithBackoff(url: string, data: any, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await makeRequest(url, data);
    } catch (error) {
      if (error instanceof RateLimitError && retries < maxRetries - 1) {
        const backoffTime = Math.pow(2, retries) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        retries++;
      } else {
        throw error;
      }
    }
  }
}
```

#### Queue-Based Processing

```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsInWindow = 0;
  private windowStart = Date.now();

  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset window if needed
      const now = Date.now();
      if (now - this.windowStart >= 10000) {
        this.windowStart = now;
        this.requestsInWindow = 0;
      }

      // Check if we can make a request
      if (this.requestsInWindow >= 90) {
        const waitTime = 10000 - (now - this.windowStart);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Process next request
      const requestFn = this.queue.shift()!;
      await requestFn();
      this.requestsInWindow++;

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}
```

## Best Practices

### For API Clients

1. **Respect Retry-After Headers**: Always honour the retry delay
2. **Implement Exponential Backoff**: Gradually increase retry delays
3. **Use Request Queuing**: Batch and queue requests to stay within limits
4. **Monitor Rate Limit Headers**: Track remaining quota when available
5. **Cache Responses**: Avoid redundant requests where possible

### For High-Volume Applications

1. **Batch Processing**: Group multiple assessments when possible
2. **Distributed Processing**: Spread requests across multiple API keys/IPs
3. **Request Scheduling**: Distribute requests over time to avoid bursts
4. **Error Recovery**: Implement robust retry mechanisms
5. **Monitoring**: Track rate limit hits and adjust processing accordingly

### Configuration Recommendations

#### Development Environment

```bash
THROTTLER_TTL=5000           # 5 seconds for faster testing
UNAUTHENTICATED_THROTTLER_LIMIT=50
AUTHENTICATED_THROTTLER_LIMIT=200
```

#### Production Environment

```bash
THROTTLER_TTL=10000          # 10 seconds (default)
UNAUTHENTICATED_THROTTLER_LIMIT=10   # Conservative for public access
AUTHENTICATED_THROTTLER_LIMIT=90     # Supports classroom scenarios
```

#### High-Volume Production

```bash
THROTTLER_TTL=60000          # 1 minute windows
UNAUTHENTICATED_THROTTLER_LIMIT=50
AUTHENTICATED_THROTTLER_LIMIT=500    # Higher limits for enterprise use
```

## Monitoring and Observability

### Metrics to Track

1. **Rate Limit Hits**: Number of 429 responses over time
2. **Request Distribution**: Patterns of request timing
3. **Client Behaviour**: How clients handle rate limiting
4. **Resource Usage**: Server load correlation with request patterns

### Logging

Rate limit violations are logged with:

- Client identification (IP/API key)
- Request details (path, method)
- Rate limit configuration applied
- Current request count and window

## Troubleshooting

### Common Issues

#### Unexpected Rate Limiting

**Symptoms**: 429 errors despite low request volume
**Causes**:

- Shared IP addresses (multiple clients)
- Incorrect TTL configuration
- Client retry loops
**Solutions**:
- Check IP sharing scenarios
- Verify environment configuration
- Implement proper error handling

#### Poor Client Performance

**Symptoms**: Slow processing due to rate limiting
**Causes**:

- Not respecting Retry-After headers
- Inefficient retry strategies
- Burst request patterns
  **Solutions**:
- Implement proper backoff strategies
- Use request queuing
- Distribute requests over time

#### Configuration Issues

**Symptoms**: Limits too restrictive or too permissive
**Causes**:

- Incorrect environment variable values
- Misunderstanding of use case requirements
  **Solutions**:
- Review rate limit calculations
- Test with realistic load patterns
- Monitor actual usage patterns
