# Monitoring & Observability

This guide covers monitoring, logging, and observability setup for the AssessmentBot-Backend application in production environments.

## Overview

The monitoring strategy focuses on:

- **Application health** and performance metrics
- **Infrastructure monitoring** of containers and host systems
- **Security monitoring** for intrusion detection and rate limiting
- **Business metrics** for LLM usage and API performance
- **Log aggregation** and analysis for troubleshooting

## Monitoring Architecture

### Built-in Monitoring Components

The application includes several built-in monitoring features:

1. **Health check endpoint** (`/status`)
2. **Docker health checks** in production containers
3. **Structured logging** with Pino
4. **Rate limiting metrics** via NestJS Throttler
5. **Security monitoring** with Fail2ban

### External Monitoring Integration

For comprehensive monitoring, integrate with external services:

- **Application Performance Monitoring (APM)**: New Relic, Datadog, or Application Insights
- **Infrastructure monitoring**: Prometheus + Grafana, or cloud provider monitoring
- **Log aggregation**: ELK Stack, Splunk, or cloud logging services
- **Uptime monitoring**: Pingdom, UptimeRobot, or similar services

## Application Health Monitoring

### Health Check Endpoint

The application provides a comprehensive health check at `/status`:

**Endpoint**: `GET /status`

**Response format**:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

**Status codes**:
- `200 OK`: All services healthy
- `503 Service Unavailable`: One or more services unhealthy

### Docker Health Checks

Production containers include built-in health monitoring:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD [ "node", "./health-check.js" ]
```

**Health check parameters**:
- **Interval**: 30 seconds between checks
- **Timeout**: 10 seconds maximum response time
- **Start period**: 5 seconds grace period after container start
- **Retries**: 3 consecutive failures trigger unhealthy status

### Monitoring with Docker Compose

Check container health status:

```bash
# View container health status
docker-compose ps

# View health check logs
docker inspect assessmentbot-app --format='{{.State.Health.Status}}'

# Monitor health check history
docker inspect assessmentbot-app --format='{{range .State.Health.Log}}{{.Start}}: {{.Output}}{{end}}'
```

## Logging and Log Management

### Application Logging

The application uses `nestjs-pino` for structured JSON logging:

**Log levels** (in order of severity):
- `fatal`: Application crashes or critical errors
- `error`: Error conditions that don't stop the application
- `warn`: Warning conditions
- `info`: General information messages
- `debug`: Debug information (development only)
- `trace`: Very detailed debug information

**Log format example**:
```json
{
  "level": 30,
  "time": 1672531200000,
  "pid": 1,
  "hostname": "app-container",
  "req": {
    "method": "POST",
    "url": "/v1/assessor",
    "headers": {
      "user-agent": "curl/7.68.0"
    }
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 1234,
  "msg": "request completed"
}
```

### Log Configuration

**Environment variables**:
```bash
# Production logging
LOG_LEVEL=info
LOG_FILE=/var/log/app/application.log

# Development logging  
LOG_LEVEL=debug
# No LOG_FILE for console output
```

**Log output**:
- **Development**: Pretty-printed console output
- **Production**: Structured JSON to stdout/stderr
- **File output**: Optional file logging when `LOG_FILE` is set

### Log Collection and Aggregation

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

**Docker Compose addition**:
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  ports:
    - "9200:9200"

kibana:
  image: docker.elastic.co/kibana/kibana:8.5.0
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch

filebeat:
  image: docker.elastic.co/beats/filebeat:8.5.0
  volumes:
    - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
  depends_on:
    - elasticsearch
```

**Filebeat configuration** (`filebeat.yml`):
```yaml
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'

processors:
- add_docker_metadata:
    host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

setup.kibana:
  host: "kibana:5601"
```

#### Option 2: Fluentd with Cloud Storage

**Fluentd configuration**:
```yaml
fluentd:
  image: fluent/fluentd:v1.14
  volumes:
    - ./fluentd.conf:/fluentd/etc/fluent.conf
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
  environment:
    - FLUENTD_CONF=fluent.conf
```

#### Option 3: Simple Log Aggregation

**Log collection script**:
```bash
#!/bin/bash
# /opt/assessmentbot/scripts/collect-logs.sh

LOG_DIR="/var/log/assessmentbot"
RETENTION_DAYS=30

mkdir -p $LOG_DIR

# Collect container logs
docker-compose logs --no-color --since 24h app > $LOG_DIR/app-$(date +%Y%m%d).log
docker-compose logs --no-color --since 24h caddy > $LOG_DIR/caddy-$(date +%Y%m%d).log
docker-compose logs --no-color --since 24h fail2ban > $LOG_DIR/fail2ban-$(date +%Y%m%d).log

# Remove old logs
find $LOG_DIR -name "*.log" -mtime +$RETENTION_DAYS -delete

# Compress yesterday's logs
find $LOG_DIR -name "*-$(date -d yesterday +%Y%m%d).log" -exec gzip {} \;
```

**Cron job setup**:
```bash
# Add to crontab
0 2 * * * /opt/assessmentbot/scripts/collect-logs.sh
```

## Infrastructure Monitoring

### Container Monitoring

#### Docker Stats Monitoring

**Real-time monitoring**:
```bash
# Monitor resource usage
docker stats

# Export metrics to file
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" > /tmp/docker-stats.txt
```

#### cAdvisor Integration

**Add to docker-compose.yml**:
```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  container_name: cadvisor
  ports:
    - "8080:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  privileged: true
  devices:
    - /dev/kmsg
```

### Host System Monitoring

#### System Metrics Script

```bash
#!/bin/bash
# /opt/assessmentbot/scripts/system-metrics.sh

METRICS_FILE="/var/log/assessmentbot/system-metrics.log"

{
  echo "timestamp: $(date -Iseconds)"
  echo "cpu_usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"
  echo "memory_usage: $(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')"
  echo "disk_usage: $(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)"
  echo "load_average: $(uptime | awk -F'load average:' '{print $2}')"
  echo "---"
} >> $METRICS_FILE
```

#### Node Exporter (Prometheus)

**Installation**:
```bash
# Download and install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvf node_exporter-1.5.0.linux-amd64.tar.gz
sudo cp node_exporter-1.5.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

## Application Performance Monitoring

### Custom Metrics Collection

#### Response Time Tracking

The application automatically logs response times. For custom metrics:

```typescript
// Example custom metrics service
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  trackLlmRequest(model: string, duration: number, success: boolean): void {
    this.logger.log({
      metric: 'llm_request',
      model,
      duration_ms: duration,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  trackApiUsage(endpoint: string, method: string, statusCode: number): void {
    this.logger.log({
      metric: 'api_usage',
      endpoint,
      method,
      status_code: statusCode,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### Business Metrics

Track important business metrics:

```typescript
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  trackAssessment(taskType: string, processingTime: number): void {
    this.logger.log({
      metric: 'assessment_completed',
      task_type: taskType,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
    });
  }

  trackError(errorType: string, endpoint: string): void {
    this.logger.log({
      metric: 'error_occurred',
      error_type: errorType,
      endpoint,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### LLM Usage Monitoring

Track usage of the Gemini API:

```typescript
@Injectable()
export class LlmMetricsService {
  private readonly logger = new Logger(LlmMetricsService.name);

  trackTokenUsage(model: string, inputTokens: number, outputTokens: number): void {
    this.logger.log({
      metric: 'llm_token_usage',
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      timestamp: new Date().toISOString(),
    });
  }

  trackRateLimit(model: string, retryAttempt: number): void {
    this.logger.warn({
      metric: 'llm_rate_limit',
      model,
      retry_attempt: retryAttempt,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Security Monitoring

### Fail2ban Integration

The production setup includes Fail2ban for intrusion prevention:

**Configuration** (`fail2ban/jail.local`):
```ini
[caddy-auth]
enabled = true
port    = http,https
filter  = caddy-auth
logpath = /var/log/caddy/access.log
maxretry = 5
findtime = 600
bantime = 3600
```

**Monitoring Fail2ban**:
```bash
# Check banned IPs
docker-compose exec fail2ban fail2ban-client status caddy-auth

# View ban/unban history
docker-compose logs fail2ban | grep "Ban\|Unban"

# Manual IP management
docker-compose exec fail2ban fail2ban-client set caddy-auth banip 192.168.1.100
docker-compose exec fail2ban fail2ban-client set caddy-auth unbanip 192.168.1.100
```

### Access Log Monitoring

Monitor suspicious access patterns:

```bash
#!/bin/bash
# /opt/assessmentbot/scripts/security-monitor.sh

CADDY_LOG="/var/log/caddy/access.log"
ALERT_THRESHOLD=100

# Count requests per IP in the last hour
awk -v threshold=$ALERT_THRESHOLD '
  $4 > systime() - 3600 {
    ip_count[$1]++
  }
  END {
    for (ip in ip_count) {
      if (ip_count[ip] > threshold) {
        print "High request rate from IP:", ip, "Requests:", ip_count[ip]
      }
    }
  }' $CADDY_LOG
```

### Rate Limiting Metrics

Monitor application rate limiting:

```typescript
@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);

  trackRateLimitHit(ip: string, endpoint: string, limit: number): void {
    this.logger.warn({
      metric: 'rate_limit_exceeded',
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString(),
    });
  }

  trackAuthenticationFailure(ip: string, reason: string): void {
    this.logger.warn({
      metric: 'auth_failure',
      ip,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Alerting and Notifications

### Health Check Monitoring

#### Simple Health Check Script

```bash
#!/bin/bash
# /opt/assessmentbot/scripts/health-monitor.sh

SERVICE_URL="https://your-domain.com/status"
ALERT_EMAIL="admin@your-domain.com"

# Check service health
response=$(curl -s -w "%{http_code}" -o /tmp/health_response $SERVICE_URL)
http_code="${response: -3}"

if [ "$http_code" != "200" ]; then
  echo "Service health check failed with HTTP $http_code" | \
    mail -s "AssessmentBot Service Alert" $ALERT_EMAIL
fi

# Check critical containers
if ! docker-compose ps | grep -q "Up"; then
  echo "One or more containers are not running" | \
    mail -s "AssessmentBot Container Alert" $ALERT_EMAIL
fi
```

**Cron job setup**:
```bash
# Check every 5 minutes
*/5 * * * * /opt/assessmentbot/scripts/health-monitor.sh
```

#### Advanced Monitoring with Prometheus

**Prometheus configuration** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'assessmentbot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['localhost:8080']
```

**Alerting rules** (`alerts.yml`):
```yaml
groups:
  - name: assessmentbot.rules
    rules:
      - alert: ServiceDown
        expr: up{job="assessmentbot"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AssessmentBot service is down"
          description: "The AssessmentBot service has been down for more than 2 minutes."

      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 5 seconds."

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10% for more than 3 minutes."
```

### Slack/Discord Integration

#### Webhook Notification Script

```bash
#!/bin/bash
# /opt/assessmentbot/scripts/send-alert.sh

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
MESSAGE="$1"
SEVERITY="$2"

case $SEVERITY in
  "critical")
    COLOR="#FF0000"
    EMOJI=":rotating_light:"
    ;;
  "warning")
    COLOR="#FFA500"
    EMOJI=":warning:"
    ;;
  *)
    COLOR="#00FF00"
    EMOJI=":information_source:"
    ;;
esac

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$EMOJI AssessmentBot Alert\",\"attachments\":[{\"color\":\"$COLOR\",\"text\":\"$MESSAGE\"}]}" \
  $WEBHOOK_URL
```

## Performance Monitoring Dashboards

### Grafana Dashboard

**Key metrics to monitor**:

1. **Application Metrics**:
   - Request rate (requests/second)
   - Response time (95th percentile)
   - Error rate (percentage)
   - Active connections

2. **Infrastructure Metrics**:
   - CPU usage (percentage)
   - Memory usage (percentage)
   - Disk usage (percentage)
   - Network I/O

3. **Business Metrics**:
   - Assessments per hour
   - LLM API usage
   - Token consumption
   - User activity

4. **Security Metrics**:
   - Failed authentication attempts
   - Rate limit hits
   - Banned IP addresses
   - Suspicious activity patterns

### Custom Dashboard Queries

**Prometheus queries for key metrics**:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Container memory usage
container_memory_usage_bytes{name="assessmentbot-app"} / container_spec_memory_limit_bytes{name="assessmentbot-app"}
```

## Troubleshooting Monitoring Issues

### Common Problems

#### Missing Metrics

1. **Check service endpoints**:
   ```bash
   curl http://localhost:3000/status
   curl http://localhost:3000/metrics
   ```

2. **Verify log output**:
   ```bash
   docker-compose logs app | grep -i error
   ```

3. **Test connectivity**:
   ```bash
   docker-compose exec app wget -qO- http://localhost:3000/status
   ```

#### Performance Issues

1. **Check resource usage**:
   ```bash
   docker stats assessmentbot-app
   top -p $(docker inspect -f '{{.State.Pid}}' assessmentbot-app)
   ```

2. **Analyze slow queries**:
   ```bash
   # Look for slow LLM requests
   docker-compose logs app | grep "duration_ms" | grep -E "[0-9]{4,}"
   ```

#### Log Collection Problems

1. **Verify log permissions**:
   ```bash
   ls -la /var/lib/docker/containers/
   docker inspect assessmentbot-app | grep LogPath
   ```

2. **Check disk space**:
   ```bash
   df -h
   docker system df
   ```

## Best Practices

### Monitoring Strategy

1. **Layer monitoring**: Monitor application, infrastructure, and business metrics
2. **Proactive alerting**: Set up alerts before problems become critical
3. **Regular review**: Regularly review and adjust monitoring thresholds
4. **Documentation**: Document all monitoring setup and procedures

### Log Management

1. **Structured logging**: Use consistent JSON format for all logs
2. **Log rotation**: Implement proper log rotation to prevent disk issues
3. **Sensitive data**: Never log sensitive information (API keys, passwords)
4. **Retention policies**: Set appropriate log retention based on compliance needs

### Performance Monitoring

1. **Baseline establishment**: Establish performance baselines in production
2. **Trend analysis**: Monitor trends over time, not just current values
3. **Business context**: Correlate technical metrics with business events
4. **Regular testing**: Regularly test monitoring and alerting systems

This comprehensive monitoring setup ensures visibility into all aspects of the AssessmentBot-Backend application and infrastructure.