# Production Setup

This guide covers the complete production environment configuration for the AssessmentBot-Backend application.

## Overview

The production setup is designed for:

- **High availability**: Automatic restarts and health monitoring
- **Security**: Authentication, rate limiting, and intrusion prevention
- **Performance**: Optimised container images and efficient resource usage
- **Observability**: Comprehensive logging and monitoring
- **Scalability**: Container-based architecture ready for orchestration

## Server Requirements

### Minimum System Requirements

- **OS**: Linux (Ubuntu 20.04+ or CentOS 8+ recommended)
- **CPU**: 2 cores minimum, 4+ cores recommended
- **RAM**: 2GB minimum, 4GB+ recommended
- **Storage**: 20GB minimum, SSD recommended
- **Network**: Stable internet connection for LLM API calls

### Software Dependencies

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For deployment automation
- **SSL Certificate**: For HTTPS (Let's Encrypt via Caddy)

## Pre-production Checklist

### Security Preparation

- [ ] **Generate secure API keys** using cryptographically strong methods
- [ ] **Configure firewall** to allow only necessary ports (80, 443, 22)
- [ ] **Set up SSH key authentication** and disable password authentication
- [ ] **Configure automatic security updates** for the host system
- [ ] **Review and update** all default passwords and credentials

### Environment Configuration

- [ ] **Create production environment file** with all required variables
- [ ] **Secure sensitive data** using appropriate secret management
- [ ] **Configure log rotation** to prevent disk space issues
- [ ] **Set up backup procedures** for configuration files
- [ ] **Plan monitoring and alerting** strategy

## Server Setup

### 1. Initial Server Configuration

#### Update System Packages

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### Install Docker and Docker Compose

```bash
# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Configure Firewall

```bash
# Ubuntu UFW
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# CentOS firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. Application Deployment

#### Clone Repository and Setup

```bash
# Create application directory
sudo mkdir -p /opt/assessmentbot
sudo chown $USER:$USER /opt/assessmentbot
cd /opt/assessmentbot

# Clone repository
git clone https://github.com/h-arnold/AssessmentBot-Backend.git .

# Create production environment file
cp .env.example .env
```

#### Configure Environment Variables

Edit `/opt/assessmentbot/.env` with production values:

```bash
# Production Environment Configuration
NODE_ENV=production
PORT=3000
APP_NAME=AssessmentBot-Backend
APP_VERSION=1.0.0

# Authentication - Generate secure API keys
API_KEYS=prod_key_32_chars_long_secure_1,prod_key_32_chars_long_secure_2

# LLM Integration
GEMINI_API_KEY=your_production_gemini_api_key

# Performance Settings
THROTTLER_TTL=60
UNAUTHENTICATED_THROTTLER_LIMIT=5
AUTHENTICATED_THROTTLER_LIMIT=10

# Logging Configuration
LOG_LEVEL=info

# File Upload Configuration
MAX_IMAGE_UPLOAD_SIZE_MB=1
ALLOWED_IMAGE_MIME_TYPES=image/png,image/jpeg

# LLM Retry Configuration
LLM_BACKOFF_BASE_MS=1000
LLM_MAX_RETRIES=3
```

#### Generate Secure API Keys

```bash
# Generate secure API keys (32 characters each)
openssl rand -base64 32
openssl rand -base64 32

# Alternative: Use Node.js crypto
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. SSL/TLS Configuration

The application uses Caddy for automatic HTTPS with Let's Encrypt.

#### Configure Domain

Update `Caddyfile` for your domain:

```
your-domain.com {
  reverse_proxy app:3000
  log {
    output file /var/log/caddy/access.log
    format single_field common_log
  }
}
```

#### DNS Configuration

Ensure your domain points to the server:

```bash
# Verify DNS resolution
nslookup your-domain.com
dig your-domain.com A
```

## Production Deployment

### 1. Deploy with Docker Compose

```bash
# Navigate to application directory
cd /opt/assessmentbot

# Start all services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f app
```

### 2. Verify Deployment

#### Check Service Status

```bash
# All containers should be "Up"
docker-compose ps

# Expected output:
# assessmentbot-app    Up      3000/tcp
# caddy               Up      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# fail2ban            Up
```

#### Test Application Endpoints

```bash
# Test health endpoint
curl -f https://your-domain.com/status

# Test with API key
curl -H "Authorization: Bearer your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"taskType":"TEXT","reference":"test","template":"test","studentResponse":"test"}' \
     https://your-domain.com/v1/assessor
```

#### Verify SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Verify certificate expiry
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## System Service Configuration

### 1. Create Systemd Service

Create `/etc/systemd/system/assessmentbot.service`:

```ini
[Unit]
Description=AssessmentBot Backend
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/assessmentbot
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

### 2. Enable Automatic Startup

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable assessmentbot.service

# Start service
sudo systemctl start assessmentbot.service

# Check status
sudo systemctl status assessmentbot.service
```

## Log Management

### 1. Configure Log Rotation

Create `/etc/logrotate.d/assessmentbot`:

```
/opt/assessmentbot/caddy_logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/assessmentbot/docker-compose.yml restart caddy
    endscript
}

/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

### 2. Set Up Centralised Logging

#### Option 1: Local Aggregation

```bash
# Create log aggregation script
cat > /opt/assessmentbot/collect-logs.sh << 'EOF'
#!/bin/bash
LOG_DIR="/var/log/assessmentbot"
mkdir -p $LOG_DIR

# Collect application logs
docker-compose logs --no-color app > $LOG_DIR/app.log 2>&1

# Collect Caddy logs
docker-compose logs --no-color caddy > $LOG_DIR/caddy.log 2>&1

# Collect Fail2ban logs
docker-compose logs --no-color fail2ban > $LOG_DIR/fail2ban.log 2>&1
EOF

chmod +x /opt/assessmentbot/collect-logs.sh

# Add to crontab for regular collection
echo "0 * * * * /opt/assessmentbot/collect-logs.sh" | sudo crontab -
```

## Security Hardening

### 1. Container Security

#### Non-root Containers

The production image already runs as non-root user (`appuser`).

#### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
app:
  image: ghcr.io/h-arnold/assessmentbot-backend:latest
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1.0'
      reservations:
        memory: 256M
        cpus: '0.5'
```

### 2. Host Security

#### SSH Hardening

Edit `/etc/ssh/sshd_config`:

```
# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional)
Port 2222

# Limit users
AllowUsers your-username
```

Restart SSH service:

```bash
sudo systemctl restart sshd
```

#### Automatic Security Updates

```bash
# Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# CentOS
sudo yum install yum-cron
sudo systemctl enable yum-cron
sudo systemctl start yum-cron
```

### 3. Application Security

#### API Key Management

- Store API keys securely (consider using a secret management service)
- Rotate keys regularly (quarterly recommended)
- Monitor API key usage through logs
- Use different keys for different environments

#### Rate Limiting Configuration

Adjust rate limiting based on expected traffic:

```bash
# For high-traffic production
THROTTLER_TTL=60
UNAUTHENTICATED_THROTTLER_LIMIT=10
AUTHENTICATED_THROTTLER_LIMIT=50

# For low-traffic production
THROTTLER_TTL=60
UNAUTHENTICATED_THROTTLER_LIMIT=5
AUTHENTICATED_THROTTLER_LIMIT=20
```

## Performance Optimisation

### 1. Container Optimisation

#### Enable Docker BuildKit

```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Add to ~/.bashrc for persistence
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
echo 'export COMPOSE_DOCKER_CLI_BUILD=1' >> ~/.bashrc
```

#### Docker Daemon Configuration

Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

### 2. Application Performance

#### Memory Management

Monitor memory usage:

```bash
# Check container memory usage
docker stats

# Application memory monitoring
docker-compose exec app top
```

#### LLM API Optimisation

Configure retry settings for better performance:

```bash
# Optimised for production
LLM_BACKOFF_BASE_MS=500    # Faster initial retry
LLM_MAX_RETRIES=5          # More retry attempts
```

## Backup and Recovery

### 1. Configuration Backup

```bash
# Create backup script
cat > /opt/assessmentbot/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/assessmentbot/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup configuration files
cp .env $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/
cp Caddyfile $BACKUP_DIR/
cp -r fail2ban $BACKUP_DIR/

# Backup Docker volumes
docker run --rm -v assessmentbot_caddy_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/caddy_data.tar.gz -C /data .

# Create backup archive
tar czf /backup/assessmentbot-$(date +%Y%m%d).tar.gz -C /backup assessmentbot
EOF

chmod +x /opt/assessmentbot/backup.sh

# Schedule regular backups
echo "0 2 * * * /opt/assessmentbot/backup.sh" | sudo crontab -
```

### 2. Disaster Recovery

#### Recovery Procedure

1. **Restore configuration**:
   ```bash
   cd /opt/assessmentbot
   tar xzf /backup/assessmentbot-YYYYMMDD.tar.gz
   ```

2. **Restore Docker volumes**:
   ```bash
   docker volume create assessmentbot_caddy_data
   docker run --rm -v assessmentbot_caddy_data:/data -v /backup:/backup alpine tar xzf /backup/caddy_data.tar.gz -C /data
   ```

3. **Restart services**:
   ```bash
   docker-compose up -d
   ```

## Maintenance Procedures

### 1. Regular Maintenance

#### Weekly Tasks

- Review application logs for errors
- Check disk space usage
- Monitor container resource usage
- Verify SSL certificate validity
- Review Fail2ban logs for security incidents

#### Monthly Tasks

- Update Docker images to latest versions
- Rotate API keys (if policy requires)
- Review and clean up old log files
- Test backup and recovery procedures
- Update server packages

### 2. Update Procedures

#### Application Updates

```bash
# Pull latest images
cd /opt/assessmentbot
docker-compose pull

# Restart with new images
docker-compose up -d

# Verify update
docker-compose logs -f app
```

#### System Updates

```bash
# Update server packages
sudo apt update && sudo apt upgrade -y

# Reboot if kernel updates were installed
sudo reboot
```

## Troubleshooting

### Common Production Issues

#### Application Won't Start

```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs app

# Check environment variables
docker-compose exec app env
```

#### SSL Certificate Issues

```bash
# Check Caddy logs
docker-compose logs caddy

# Manually request certificate
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

#### High Memory Usage

```bash
# Monitor resource usage
docker stats

# Restart application if needed
docker-compose restart app
```

#### Failed Health Checks

```bash
# Test health endpoint directly
curl -f http://localhost:3000/status

# Check application health from inside container
docker-compose exec app node health-check.js
```

### Performance Issues

#### High Response Times

1. Check LLM API connectivity and quotas
2. Monitor server resource usage
3. Review application logs for bottlenecks
4. Consider scaling options

#### Rate Limiting Problems

1. Review Fail2ban logs
2. Adjust throttling settings
3. Monitor legitimate vs malicious traffic
4. Consider IP whitelisting for trusted sources

## Monitoring Integration

For comprehensive monitoring, see:
- [Monitoring & Observability Guide](monitoring.md)
- [CI/CD Pipeline Guide](cicd.md)

This production setup provides a robust, secure, and scalable foundation for the AssessmentBot-Backend application.