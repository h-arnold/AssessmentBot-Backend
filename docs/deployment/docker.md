# Docker Deployment

This guide covers the containerised deployment of the AssessmentBot-Backend using Docker and Docker Compose.

## Overview

The AssessmentBot-Backend supports two Docker deployment scenarios:

- **Development**: Local development with hot-reloading and debugging capabilities
- **Production**: Optimised, secure containers for production environments

## Docker Images

### Development Image

The development Docker image is built from `Docker/Dockerfile` and includes:

- Node.js 22 Alpine base image
- Full development dependencies (including devDependencies)
- Hot-reloading capabilities via `npm run start:dev`
- Debugging support on port 9229

### Production Image

The production image is built from `Docker/Dockerfile.prod` using multi-stage builds:

- **Stage 1 (Build)**: Compiles TypeScript and prepares the application
- **Stage 2 (Production)**: Creates a minimal, secure runtime image

#### Production Image Features

- **Multi-stage build**: Reduces final image size by excluding build tools
- **Non-root user**: Runs as `appuser` for enhanced security
- **Health checks**: Built-in health monitoring via `/health` endpoint
- **Optimised layers**: Uses BuildKit cache mounts for faster builds
- **Security labels**: Proper image metadata and labels

## Local Development with Docker

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned locally

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/h-arnold/AssessmentBot-Backend.git
   cd AssessmentBot-Backend
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration, especially GEMINI_API_KEY
   ```

3. **Build and run the development container**:
   ```bash
   docker build -f Docker/Dockerfile -t assessmentbot-backend:dev .
   docker run -p 3000:3000 --env-file .env assessmentbot-backend:dev
   ```

4. **Access the application**:
   - API: `http://localhost:3000`
   - Health check: `http://localhost:3000/status`

### Development Container Features

- **Volume mounting**: Mount source code for live development
- **Port forwarding**: Access application on localhost:3000
- **Environment variables**: Load from `.env` file
- **Hot reloading**: Automatic restart on file changes

## Production Deployment

### Building Production Images

#### Build Locally

```bash
# Build production image
docker build -f Docker/Dockerfile.prod -t assessmentbot-backend:prod .

# Run production container
docker run -p 3000:3000 --env-file .env assessmentbot-backend:prod
```

#### Using Docker Compose (Recommended)

The production setup uses Docker Compose with multiple services:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Compose Services

The `docker-compose.yml` defines three services:

#### 1. Application (`app`)

- **Image**: `ghcr.io/h-arnold/assessmentbot-backend:latest`
- **Container**: `assessmentbot-app`
- **Port**: Internal port 3000 (not exposed externally)
- **Network**: Connected to internal `web` network
- **Restart**: `unless-stopped` for high availability

```yaml
app:
  image: ghcr.io/h-arnold/assessmentbot-backend:latest
  container_name: assessmentbot-app
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - LOG_LEVEL=${LOG_LEVEL:-info}
  expose:
    - "3000"
  networks:
    - web
```

#### 2. Reverse Proxy (`caddy`)

- **Image**: `caddy:2-alpine`
- **Purpose**: HTTP/HTTPS termination and reverse proxy
- **Ports**: 80 (HTTP) and 443 (HTTPS)
- **Configuration**: Uses `Caddyfile` for routing rules
- **Features**: Automatic HTTPS with Let's Encrypt

```yaml
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
    - caddy_config:/config
    - caddy_logs:/var/log/caddy
```

#### 3. Security (`fail2ban`)

- **Image**: `crazymax/fail2ban:latest`
- **Purpose**: Intrusion prevention and rate limiting
- **Configuration**: Monitors Caddy access logs
- **Network**: Host network mode for iptables access

```yaml
fail2ban:
  image: crazymax/fail2ban:latest
  volumes:
    - ./fail2ban/jail.local:/data/jail.local:ro
    - caddy_logs:/var/log/caddy:ro
  cap_add:
    - NET_ADMIN
    - NET_RAW
  network_mode: host
```

## Configuration

### Environment Variables

Configure the application using environment variables:

```bash
# Core Application
NODE_ENV=production
PORT=3000
APP_NAME=AssessmentBot-Backend
APP_VERSION=1.0.0

# Authentication
API_KEYS=your_production_key1,your_production_key2

# LLM Integration
GEMINI_API_KEY=your_gemini_api_key

# Rate Limiting
THROTTLER_TTL=60
UNAUTHENTICATED_THROTTLER_LIMIT=5
AUTHENTICATED_THROTTLER_LIMIT=10

# Logging
LOG_LEVEL=info

# File Upload Limits
MAX_IMAGE_UPLOAD_SIZE_MB=1
ALLOWED_IMAGE_MIME_TYPES=image/png,image/jpeg
```

### Caddy Configuration

The `Caddyfile` provides reverse proxy configuration:

```
:80, :443 {
  reverse_proxy app:3000
  log {
    output file /var/log/caddy/access.log
    format single_field common_log
  }
}
```

Features:
- **Automatic HTTPS**: Let's Encrypt integration
- **Reverse proxy**: Routes traffic to the app container
- **Access logging**: Logs requests for monitoring and security

### Fail2ban Configuration

Security configuration in `fail2ban/jail.local`:

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

Protection features:
- **Rate limiting**: Blocks IPs after 5 failed attempts
- **Time window**: 10-minute detection window
- **Ban duration**: 1-hour bans for offending IPs

## Health Monitoring

### Docker Health Checks

The production image includes built-in health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD [ "node", "./health-check.js" ]
```

The health check script (`scripts/health-check.js`):
- Tests the `/health` endpoint
- 2-second timeout
- Returns appropriate exit codes

### Application Health Endpoint

The application provides a health check endpoint:

```bash
# Check application health
curl http://localhost:3000/status

# Expected response
{
  "status": "ok",
  "info": {},
  "error": {},
  "details": {}
}
```

## Docker Best Practices

### Security

1. **Non-root user**: Containers run as `appuser`, not root
2. **Minimal image**: Alpine-based images for smaller attack surface
3. **Layer optimisation**: Efficient layer caching for faster builds
4. **Secret management**: Environment variables for sensitive data

### Performance

1. **Multi-stage builds**: Separate build and runtime stages
2. **BuildKit caching**: Cache mounts for npm dependencies
3. **Production dependencies**: Only production npm packages in final image
4. **Health checks**: Monitor container health automatically

### Maintenance

1. **Image labels**: Proper metadata for image tracking
2. **Volume persistence**: Persistent volumes for logs and data
3. **Restart policies**: Automatic container restart on failure
4. **Log aggregation**: Centralised logging through Docker

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check container logs
docker-compose logs app

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart app
```

#### Permission Errors

Ensure proper file permissions for mounted volumes:

```bash
# Fix ownership issues
sudo chown -R 1000:1000 ./data
```

#### Network Connectivity

Test connectivity between containers:

```bash
# Execute shell in app container
docker-compose exec app sh

# Test connection to other services
wget -q --spider http://caddy
```

#### Environment Variables

Verify environment variable loading:

```bash
# Check environment in container
docker-compose exec app env | grep NODE_ENV
```

### Performance Issues

#### Memory Usage

Monitor container resource usage:

```bash
# Check resource usage
docker stats

# Set memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

#### Startup Time

Optimise startup performance:

1. Use smaller base images
2. Minimise build context
3. Cache npm dependencies effectively
4. Use .dockerignore to exclude unnecessary files

## Container Registry

### GitHub Container Registry

Production images are automatically published to GitHub Container Registry:

- **Registry**: `ghcr.io/h-arnold/assessmentbot-backend`
- **Tags**: Version tags (e.g., `v1.0.0`) and `latest`
- **Access**: Public images (no authentication required for pulling)

### Pulling Images

```bash
# Pull latest image
docker pull ghcr.io/h-arnold/assessmentbot-backend:latest

# Pull specific version
docker pull ghcr.io/h-arnold/assessmentbot-backend:v1.0.0
```

### Image Information

View image metadata:

```bash
# Inspect image
docker inspect ghcr.io/h-arnold/assessmentbot-backend:latest

# View image layers
docker history ghcr.io/h-arnold/assessmentbot-backend:latest
```

## Next Steps

After setting up Docker deployment:

1. **Production Setup**: See [Production Setup Guide](production.md)
2. **CI/CD Integration**: See [CI/CD Pipeline Guide](cicd.md)
3. **Monitoring**: See [Monitoring & Observability Guide](monitoring.md)