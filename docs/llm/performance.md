# LLM Performance Optimisation

This document outlines performance considerations and optimisation strategies for the LLM integration system. Understanding these factors is crucial for maintaining responsive assessment services whilst managing costs and resource usage.

## Performance Factors

### Response Time Components

Total response time consists of:

1. **Network Latency**: Round-trip time to LLM provider
2. **Processing Time**: LLM inference and generation time
3. **Retry Delays**: Exponential backoff for rate-limited requests
4. **Parsing Time**: JSON parsing and validation (minimal)

### Key Performance Metrics

```typescript
// Typical response times (approximate)
const responseTimes = {
  textOnly: '1-3 seconds',        // Simple text assessments
  multimodal: '3-8 seconds',      // Image + text assessments
  withRetries: '+2-10 seconds',   // Including rate limit retries
  validationErrors: '+0.1 seconds' // JSON parsing overhead
};
```

## Model Selection Strategy

### Gemini Model Performance

The system automatically selects models based on content type:

```typescript
const modelSelection = {
  textOnly: {
    model: 'gemini-2.0-flash-lite',
    characteristics: {
      speed: 'Very Fast',
      costPerToken: 'Low',
      capabilities: 'Text-only processing'
    }
  },
  multimodal: {
    model: 'gemini-2.5-flash', 
    characteristics: {
      speed: 'Moderate',
      costPerToken: 'Higher',
      capabilities: 'Text + image processing'
    }
  }
};
```

### Performance Trade-offs

| Model | Speed | Cost | Quality | Use Case |
|-------|-------|------|---------|----------|
| gemini-2.0-flash-lite | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Text assessments |
| gemini-2.5-flash | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Image assessments |

## Temperature Impact on Performance

Temperature affects both response quality and processing time:

```typescript
const temperatureEffects = {
  0.0: {
    speed: 'Fastest',
    consistency: 'Highest',
    creativity: 'Lowest',
    useCase: 'Consistent assessments'
  },
  0.2: {
    speed: 'Fast',
    consistency: 'High', 
    creativity: 'Low',
    useCase: 'Slight variation in wording'
  },
  0.5: {
    speed: 'Moderate',
    consistency: 'Medium',
    creativity: 'Medium',
    useCase: 'Balanced responses'
  },
  1.0: {
    speed: 'Slower',
    consistency: 'Lower',
    creativity: 'High',
    useCase: 'Creative writing assessment'
  }
};
```

### Recommended Temperature Settings

```typescript
const recommendedTemperatures = {
  structuredAssessment: 0.0,    // Consistent scoring
  explanatoryFeedback: 0.1,     // Slight wording variation
  creativeEvaluation: 0.3,      // More varied explanations
  debuggingPrompts: 0.0         // Deterministic for testing
};
```

## Optimisation Strategies

### 1. Prompt Engineering for Performance

**Concise System Prompts:**
```typescript
// Optimised: Clear, focused system instruction
const efficientSystemPrompt = `
Assess the student response using exactly this JSON format:
{
  "completeness": {"score": 0-5, "reasoning": "brief explanation"},
  "accuracy": {"score": 0-5, "reasoning": "brief explanation"}, 
  "spag": {"score": 0-5, "reasoning": "brief explanation"}
}
`;

// Avoid: Lengthy, verbose instructions that increase processing time
```

**Structured Output Requests:**
```typescript
// Good: Explicit format requirements
const structuredRequest = "Return your assessment as valid JSON with no additional text.";

// Avoid: Ambiguous format requests that may require multiple generations
```

### 2. Payload Optimisation

**Image Optimisation:**
```typescript
// Optimise image payloads for faster processing
const imageOptimisation = {
  maxDimensions: '1024x1024px',    // Reduces processing time
  compression: 'JPEG 80% quality', // Balances quality and size
  formats: ['JPEG', 'PNG'],        // Supported efficient formats
  maxFileSize: '1MB'               // Per image limit
};
```

**Content Batching:**
```typescript
// Assess multiple items in single request when possible
const batchedAssessment = {
  system: "Assess each response separately...",
  user: `
    Response 1: ${response1}
    Response 2: ${response2}
    Response 3: ${response3}
  `
};
// Note: Monitor response quality with batched requests
```

### 3. Caching Strategies

**Response Caching:**
```typescript
@Injectable()
export class CachedAssessmentService {
  private readonly cache = new Map<string, LlmResponse>();
  
  async assessWithCache(payload: LlmPayload): Promise<LlmResponse> {
    const cacheKey = this.generateCacheKey(payload);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Generate and cache response
    const response = await this.llmService.send(payload);
    this.cache.set(cacheKey, response);
    return response;
  }
  
  private generateCacheKey(payload: LlmPayload): string {
    // Create deterministic hash of payload content
    return this.hashPayload(payload);
  }
}
```

**Cache Considerations:**
- Cache text-only assessments more aggressively (deterministic)
- Use shorter TTL for temperature > 0 (non-deterministic)
- Consider memory usage vs. cache hit rate trade-offs

### 4. Rate Limit Management

**Intelligent Backoff:**
```typescript
// Configuration for different environments
const backoffStrategies = {
  development: {
    maxRetries: 5,
    baseBackoffMs: 500,    // Faster retries for development
    jitterMs: 100
  },
  production: {
    maxRetries: 3,
    baseBackoffMs: 1000,   // Conservative for production
    jitterMs: 200
  },
  highVolume: {
    maxRetries: 2,
    baseBackoffMs: 2000,   // Longer delays to avoid cascading rate limits
    jitterMs: 500
  }
};
```

**Request Queuing:**
```typescript
@Injectable()
export class QueuedLLMService {
  private readonly queue = [];
  private readonly maxConcurrent = 5; // Adjust based on rate limits
  private activeRequests = 0;

  async send(payload: LlmPayload): Promise<LlmResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeRequests++;
    const request = this.queue.shift();
    
    try {
      const response = await this.llmService.send(request.payload);
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      // Process next request
      setImmediate(() => this.processQueue());
    }
  }
}
```

## Monitoring and Profiling

### Performance Metrics

Track these key performance indicators:

```typescript
const performanceMetrics = {
  // Response time metrics
  avgResponseTime: 'Average end-to-end response time',
  p95ResponseTime: '95th percentile response time',
  p99ResponseTime: '99th percentile response time',
  
  // Throughput metrics  
  requestsPerSecond: 'Successful requests per second',
  requestsPerMinute: 'Total requests per minute',
  
  // Error metrics
  rateLimitRate: 'Percentage of requests rate limited',
  errorRate: 'Percentage of failed requests',
  retryRate: 'Average number of retries per request',
  
  // Cost metrics
  tokensPerRequest: 'Average tokens consumed per request',
  costPerAssessment: 'Estimated cost per assessment'
};
```

### Performance Logging

```typescript
@Injectable()
export class PerformanceLLMService extends LLMService {
  async send(payload: LlmPayload): Promise<LlmResponse> {
    const startTime = Date.now();
    const payloadSize = JSON.stringify(payload).length;
    
    try {
      const result = await super.send(payload);
      const duration = Date.now() - startTime;
      
      this.logger.debug('LLM Request Performance', {
        duration,
        payloadSize,
        payloadType: 'images' in payload ? 'multimodal' : 'text',
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.warn('LLM Request Failed', {
        duration,
        payloadSize,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
}
```

## Cost Optimisation

### Token Usage Optimisation

```typescript
const tokenOptimisation = {
  systemPrompts: {
    strategy: 'Reuse concise system prompts',
    impact: 'Reduces tokens per request',
    implementation: 'Template-based prompt generation'
  },
  
  responseFormat: {
    strategy: 'Request structured JSON responses',
    impact: 'Reduces unnecessary prose',
    implementation: 'Explicit format instructions'
  },
  
  imageProcessing: {
    strategy: 'Optimise image dimensions and quality',
    impact: 'Reduces multimodal processing costs',
    implementation: 'Pre-processing pipeline'
  }
};
```

### Usage Patterns

Monitor and optimise these usage patterns:

```typescript
const usageOptimisation = {
  batchProcessing: {
    description: 'Process multiple assessments together',
    benefit: 'Reduces per-request overhead',
    tradeoff: 'May increase individual response time'
  },
  
  caching: {
    description: 'Cache identical or similar requests',
    benefit: 'Eliminates redundant API calls',
    tradeoff: 'Memory usage and cache invalidation complexity'
  },
  
  offPeakProcessing: {
    description: 'Process non-urgent assessments during off-peak hours',
    benefit: 'May have lower rate limiting',
    tradeoff: 'Increased latency for batch jobs'
  }
};
```

## Scaling Considerations

### Horizontal Scaling

```typescript
const scalingStrategies = {
  loadBalancing: {
    description: 'Distribute requests across multiple service instances',
    implementation: 'Stateless service design enables easy scaling',
    considerations: 'Shared rate limits across instances'
  },
  
  serviceSeparation: {
    description: 'Separate text and image assessment services',
    implementation: 'Different services for different payload types',
    benefits: 'Independent scaling and optimisation'
  },
  
  queueing: {
    description: 'Implement request queuing for burst handling',
    implementation: 'Redis or database-backed job queues',
    benefits: 'Smooths traffic spikes and improves reliability'
  }
};
```

### Provider Diversification

```typescript
const providerStrategy = {
  primaryProvider: 'Gemini for primary workloads',
  fallbackProvider: 'Alternative LLM for failover scenarios',
  loadBalancing: 'Distribute requests across multiple providers',
  costOptimisation: 'Route requests based on cost/performance profiles'
};
```

## Performance Testing

### Load Testing Scenarios

```typescript
const loadTestScenarios = {
  baseline: {
    description: 'Single concurrent user, text-only assessments',
    target: 'Establish baseline performance metrics'
  },
  
  realistic: {
    description: '10 concurrent users, mixed text/image assessments',
    target: 'Typical classroom usage pattern'
  },
  
  peak: {
    description: '50 concurrent users, primarily text assessments',
    target: 'End-of-term assessment submission spike'
  },
  
  stress: {
    description: '100+ concurrent users until failure',
    target: 'Identify breaking points and rate limits'
  }
};
```

### Benchmark Configuration

```typescript
// Test configuration for consistent benchmarking
const benchmarkConfig = {
  environment: 'test',
  llmMaxRetries: 1,           // Reduce retries for faster test execution
  llmBackoffBaseMs: 100,      // Minimal backoff for testing
  temperature: 0,             // Deterministic responses
  logLevel: 'warn',           // Reduce logging overhead
  cacheDisabled: true         // Test raw performance
};
```

## Best Practices Summary

### Development Phase
1. Use temperature 0 for consistent testing
2. Implement comprehensive logging for debugging
3. Start with simple prompts and optimise iteratively
4. Test with realistic payload sizes

### Production Deployment
1. Monitor response times and error rates
2. Implement request queuing for traffic smoothing
3. Use caching for repeated assessments
4. Configure conservative retry settings

### Scaling Strategy
1. Separate concerns (text vs. image processing)
2. Implement circuit breakers for provider failures
3. Monitor quota usage and set alerts
4. Plan for provider diversification

### Cost Management
1. Optimise prompts for minimal token usage
2. Implement intelligent caching strategies
3. Monitor per-assessment costs
4. Consider batch processing for non-urgent requests