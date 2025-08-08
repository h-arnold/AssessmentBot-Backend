# LLM Error Handling

The LLM integration system provides sophisticated error handling with automatic retry logic, quota management, and comprehensive error classification. This document details the error handling mechanisms and how to work with them effectively.

## Error Handling Architecture

### Layered Error Handling

The system employs a layered approach to error handling:

1. **Provider Layer**: Catches raw API errors from specific LLM providers
2. **Base Service Layer**: Classifies errors and applies retry logic 
3. **Application Layer**: Handles business logic errors and user-facing responses

### Error Flow

```
LLM Provider API Error
        ↓
Provider Service (_sendInternal)
        ↓
Base Service (LLMService.send)
        ↓
Error Classification & Retry Logic
        ↓
Application Code
```

## Error Types

### 1. Rate Limit Errors (Retryable)

**Characteristics:**
- HTTP status code: 429
- Error messages containing "rate limit" or "too many requests"
- Temporary condition that resolves with time

**Handling:**
- Automatically retried with exponential backoff
- Maximum retries controlled by `LLM_MAX_RETRIES` configuration
- Base delay controlled by `LLM_BACKOFF_BASE_MS` configuration

**Example:**
```typescript
// This error will be automatically retried
{
  status: 429,
  message: "Rate limit exceeded. Please try again later."
}
```

### 2. Resource Exhausted Errors (Non-Retryable)

**Characteristics:**
- HTTP status code: 429
- Error messages containing patterns like:
  - "resource_exhausted"
  - "quota exceeded" 
  - "quota exhausted"
  - "quota has been exhausted"

**Handling:**
- Thrown as `ResourceExhaustedError`
- Not retried (permanent condition until quota resets)
- Requires user intervention (upgrade plan, wait for quota reset)

**Example:**
```typescript
// This error will NOT be retried
throw new ResourceExhaustedError(
  'API quota exhausted. Please try again later or upgrade your plan.',
  originalError
);
```

### 3. Validation Errors

**Characteristics:**
- Zod validation failures on LLM responses
- Indicates structural issues with response format
- Usually provider-specific response format problems

**Handling:**
- Thrown immediately without retry
- Logged with detailed validation error information
- Indicates need for prompt engineering or response parsing improvements

**Example:**
```typescript
// ZodError from invalid response structure
{
  name: "ZodError",
  issues: [
    {
      path: ["completeness", "score"],
      message: "Expected number, received string"
    }
  ]
}
```

### 4. Network and Authentication Errors

**Characteristics:**
- Connection timeouts, DNS failures
- Invalid API keys (HTTP 401/403)
- Server errors (HTTP 5xx)

**Handling:**
- Wrapped with context information
- Not retried (usually configuration or infrastructure issues)
- Require manual intervention

## Retry Logic Implementation

### Exponential Backoff Algorithm

The system implements exponential backoff with jitter to prevent thundering herd problems:

```typescript
const delay = baseBackoffMs * Math.pow(2, attempt) + Math.random() * 100;
```

**Configuration:**
- `LLM_BACKOFF_BASE_MS`: Base delay (default: 1000ms)
- `LLM_MAX_RETRIES`: Maximum attempts (default: 3)

**Example Delays:**
- Attempt 1: 1000ms + 0-100ms random
- Attempt 2: 2000ms + 0-100ms random  
- Attempt 3: 4000ms + 0-100ms random

### Retry Decision Logic

```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    return await this._sendInternal(payload);
  } catch (error) {
    // Resource exhausted errors bubble up immediately
    if (this.isResourceExhaustedError(error)) {
      throw new ResourceExhaustedError(message, error);
    }

    const isRateLimitError = this.isRateLimitError(error);
    const isLastAttempt = attempt === maxRetries;

    // Only retry rate limit errors
    if (!isRateLimitError || isLastAttempt) {
      throw error; // or wrap with context
    }

    // Apply exponential backoff
    await this.sleep(calculateDelay(attempt));
  }
}
```

## Error Classification

### Status Code Extraction

The system handles various error formats from different LLM SDKs:

```typescript
private extractErrorStatusCode(error: unknown): number | undefined {
  // Direct status property
  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }
  
  // Alternative statusCode property
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  
  // Nested in response object
  if ('response' in error && error.response?.status) {
    return error.response.status as number;
  }
  
  return undefined;
}
```

### Resource Exhaustion Detection

Combines HTTP status code with message pattern matching:

```typescript
private isResourceExhaustedError(error: unknown): boolean {
  const statusCode = this.extractErrorStatusCode(error);
  
  // Must be HTTP 429
  if (statusCode !== 429) {
    return false;
  }
  
  // Check message patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const patterns = [
      'resource_exhausted',
      'resource exhausted', 
      'quota exceeded',
      'quota exhausted',
      'quota has been exhausted',
    ];
    return patterns.some(pattern => message.includes(pattern));
  }
  
  return false;
}
```

## Error Logging

### Structured Logging

The system provides detailed error logging at appropriate levels:

```typescript
// Rate limit retry warnings
this.logger.warn(
  `Rate limit encountered on attempt ${attempt + 1}/${maxRetries + 1}. ` +
  `Retrying in ${delay}ms. Error: ${error.message}`
);

// Validation errors  
this.logger.error('Zod validation failed', error.issues);

// Debug information for provider errors
this.providerLogger.debug('Error communicating with LLM API', error);
```

### Log Levels

- **ERROR**: Validation failures, configuration issues
- **WARN**: Rate limit encounters, retry attempts
- **DEBUG**: Provider API errors, detailed error context

## Error Handling Best Practices

### 1. Application Error Handling

```typescript
@Injectable()
export class AssessmentService {
  async assessResponse(input: string): Promise<AssessmentResult> {
    try {
      const result = await this.llmService.send(payload);
      return this.processResult(result);
    } catch (error) {
      if (error instanceof ResourceExhaustedError) {
        // Handle quota exhaustion - notify user, implement fallback
        throw new ServiceUnavailableException(
          'Assessment service temporarily unavailable due to quota limits'
        );
      }
      
      if (error instanceof ZodError) {
        // Handle validation errors - log and provide generic error
        this.logger.error('LLM response validation failed', error.issues);
        throw new InternalServerErrorException(
          'Unable to process assessment response'
        );
      }
      
      // Handle other errors
      this.logger.error('Assessment failed', error);
      throw new InternalServerErrorException('Assessment service error');
    }
  }
}
```

### 2. Monitoring and Alerting

Monitor these error patterns:

```typescript
// Key metrics to track
const errorMetrics = {
  rateLimitErrors: 'Count of 429 errors requiring retry',
  quotaExhaustedErrors: 'Count of quota exhaustion errors',
  validationErrors: 'Count of response validation failures',
  totalRetries: 'Total number of retry attempts',
  avgResponseTime: 'Average response time including retries'
};
```

### 3. Circuit Breaker Pattern

Consider implementing circuit breaker for repeated failures:

```typescript
if (consecutiveQuotaErrors > threshold) {
  // Temporarily disable LLM service
  // Implement fallback behaviour
  // Alert administrators
}
```

## Configuration Guidelines

### Production Settings

```bash
# Conservative retry settings for production
LLM_MAX_RETRIES=3
LLM_BACKOFF_BASE_MS=1000

# Monitor quota usage closely
GEMINI_API_KEY=your_production_key
```

### Development Settings

```bash
# More aggressive retries for development
LLM_MAX_RETRIES=5
LLM_BACKOFF_BASE_MS=500

# Enable debug logging
LOG_LEVEL=debug
```

### Testing Settings

```bash
# Minimal retries for fast test execution
LLM_MAX_RETRIES=1
LLM_BACKOFF_BASE_MS=100
```

## Troubleshooting Guide

### Frequent Rate Limiting

**Symptoms:**
- Many 429 errors in logs
- Slow response times due to retries

**Solutions:**
1. Increase `LLM_BACKOFF_BASE_MS` to reduce request frequency
2. Implement request queuing to smooth traffic
3. Upgrade to higher-tier API plan
4. Implement caching for repeated requests

### Quota Exhaustion

**Symptoms:**
- `ResourceExhaustedError` exceptions
- Service unavailable errors

**Solutions:**
1. Monitor quota usage in provider console
2. Implement usage tracking and alerts
3. Upgrade API plan or wait for quota reset
4. Implement graceful degradation

### Validation Failures

**Symptoms:**
- `ZodError` exceptions
- Inconsistent response formats

**Solutions:**
1. Review and improve system prompts
2. Add response format examples to prompts
3. Implement more robust JSON parsing
4. Consider alternative response schemas

### High Error Rates

**Symptoms:**
- Frequent errors across all types
- Service reliability issues

**Solutions:**
1. Review API key permissions and configuration
2. Check network connectivity and DNS resolution
3. Monitor provider service status
4. Implement fallback providers or caching
5. Review prompt engineering for complex requests

## Error Response Examples

### Successful Retry Sequence

```
[DEBUG] Sending request to Gemini...
[WARN] Rate limit encountered on attempt 1/4. Retrying in 1087ms
[DEBUG] Sending request to Gemini...  
[WARN] Rate limit encountered on attempt 2/4. Retrying in 2051ms
[DEBUG] Sending request to Gemini...
[DEBUG] Successfully received response
```

### Quota Exhaustion

```
[DEBUG] Sending request to Gemini...
[ERROR] ResourceExhaustedError: API quota exhausted. Please try again later or upgrade your plan.
```

### Validation Failure

```
[DEBUG] Raw response from Gemini: {"completness": 4, "accuracy": "high", "spag": 3}
[ERROR] Zod validation failed: [
  { "path": ["completeness"], "message": "Required" },
  { "path": ["accuracy", "score"], "message": "Expected number, received string" }
]
```