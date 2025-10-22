# Docker & Container Configuration

*Container setup, troubleshooting, and development environment configuration*

---

## Development Environment

### Starting Services

```bash
# Start all services
docker-compose up

# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Individual Service Access

```bash
# Rails console access
docker-compose exec api bash
docker-compose exec api rails console

# React debugging
docker-compose exec frontend sh
docker-compose exec frontend npm run build

# Database access
docker-compose exec db psql -U postgres -d donation_tracker_development

# Redis CLI
docker-compose exec redis redis-cli
```

---

## Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database server |
| Redis | 6379 | Cache and session storage |
| Rails API | 3001 | Backend API server |
| React Frontend | 3000 | Development frontend server |

### Port Mapping

All services are accessible from the host machine:
- Database: `localhost:5432`
- Cache: `localhost:6379`
- API: `http://localhost:3001`
- Frontend: `http://localhost:3000`

---

## Container Requirements

### Rails API Container

**Base Image:** ruby:3.x-slim

**Requirements:**
- Include build tools for native gems (gcc, make, etc.)
- Bundle install with `--without development test` for production
- Use bundle install (not bundle check) in development

**Example Dockerfile:**
```dockerfile
FROM ruby:3.2-slim

# Install dependencies for building native gems
RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    nodejs \
    npm

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

CMD ["rails", "server", "-b", "0.0.0.0"]
```

### React Frontend Container

**Base Image:** node:lts-alpine

**Requirements:**
- Use Node.js LTS version
- Use `npm install` (not `npm ci`) in development for flexibility
- Set NODE_ENV=development for development builds

**Example Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
```

### Database Container

**Base Image:** postgres:15-alpine

**Requirements:**
- Use PostgreSQL 15-alpine for performance
- Mount volume for data persistence
- Set POSTGRES_USER, POSTGRES_PASSWORD via environment variables

**docker-compose.yml example:**
```yaml
db:
  image: postgres:15-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
    POSTGRES_DB: donation_tracker_development
  ports:
    - "5432:5432"
```

### Networking

**Requirements:**
- All services must communicate via service names (not localhost)
- Define custom network in docker-compose.yml
- Services discover each other by service name

**Example:**
```yaml
# In Rails database.yml
development:
  host: db  # Service name, not localhost

# In React .env
REACT_APP_API_URL=http://api:3001  # Service name in container
```

---

## Troubleshooting Guide

### Native Gem Compilation Errors

**Symptom:**
```
An error occurred while installing pg (1.x.x), and Bundler cannot continue.
Make sure that `gem install pg -v '1.x.x'` succeeds before bundling.
```

**Solution:**
Use Docker with build tools installed:
```dockerfile
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev
```

### Container Networking Issues

**Symptom:**
```
Could not connect to server: Connection refused
Is the server running on host "localhost"?
```

**Solution:**
Check service names in configuration files:
- Use service name (`db`) instead of `localhost`
- Verify services are on same Docker network
- Check docker-compose.yml network configuration

### Database Connection Failures

**Symptom:**
```
ActiveRecord::ConnectionNotEstablished
FATAL: database "donation_tracker_development" does not exist
```

**Solution:**
```bash
# Create database
docker-compose exec api rails db:create

# Run migrations
docker-compose exec api rails db:migrate

# Verify host/port in database.yml
# host: db (not localhost)
# port: 5432
```

### npm Installation Failures

**Symptom:**
```
npm ERR! code EUSERS
npm ERR! errno -1
npm ERR! EUSERS: user limit exceeded
```

**Solution:**
Delete package-lock.json and use `npm install`:
```bash
# On host
cd donation_tracker_frontend
rm package-lock.json

# In container
docker-compose exec frontend npm install
```

### Container Exits Immediately

**Symptom:**
```
donation_tracker_frontend exited with code 0
```

**Solution:**
Check CMD in Dockerfile:
```dockerfile
# Make sure command keeps container running
CMD ["npm", "start"]  # Correct

# Not:
CMD ["npm", "install"]  # Wrong - exits after install
```

---

## Colima Configuration (macOS Docker Alternative)

### Minimum Resource Requirements

**Problem:** Frontend container crashes with "process exited too early" after successful webpack compilation

**Root Cause:** Insufficient Colima VM resources causing Node.js memory constraints

### Required Resources

| Resource | Default | Required | Reason |
|----------|---------|----------|--------|
| Memory | 2GB | 6GB | Node.js webpack builds require 4GB+ |
| CPUs | 2 cores | 4 cores | Parallel webpack compilation |
| Disk | 60GB | 100GB | Dependencies and build artifacts |

### Colima Setup Commands

```bash
# Stop Colima (if running)
colima stop

# Start with increased resources
colima start --cpu 4 --memory 6 --disk 100

# Verify allocation
colima status

# Expected output:
# INFO[0000] colima is running
# INFO[0000] arch: aarch64
# INFO[0000] runtime: docker
# INFO[0000] mountType: sshfs
# INFO[0000] address: 192.168.106.2
# INFO[0000] cpus: 4
# INFO[0000] disk: 100GiB
# INFO[0000] memory: 6GiB

# Then start Docker services
cd /path/to/DonationTracker
docker-compose up
```

### Resource Limits in docker-compose.yml

```yaml
services:
  frontend:
    build: ./donation_tracker_frontend
    ports:
      - "3000:3000"
    volumes:
      - ./donation_tracker_frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G  # Requires 6GB Colima VM for headroom
        reservations:
          cpus: '1'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Common Colima Issues

**Issue: "Cannot connect to Docker daemon"**
```bash
# Solution: Ensure Colima is running
colima status
colima start --cpu 4 --memory 6 --disk 100
```

**Issue: "Out of disk space"**
```bash
# Solution: Increase disk allocation
colima stop
colima start --cpu 4 --memory 6 --disk 150

# Or clean up Docker resources
docker system prune -a --volumes
```

**Issue: "Slow performance"**
```bash
# Solution: Increase CPU/memory
colima stop
colima start --cpu 6 --memory 8 --disk 100
```

---

## Development Commands Reference

### Backend Commands

```bash
# Rails console
docker-compose exec api rails console

# Run migrations
docker-compose exec api rails db:migrate

# Rollback migrations
docker-compose exec api rails db:rollback

# Seed database
docker-compose exec api rails db:seed

# Run tests
docker-compose exec api bundle exec rspec

# Run linter
docker-compose exec api bundle exec rubocop

# Run security scan
docker-compose exec api bundle exec brakeman

# Check code smells
docker-compose exec api bundle exec reek app/

# Generate quality report
docker-compose exec api bundle exec rubycritic --no-browser app/

# Check cost metrics
docker-compose exec api bundle exec skunk
```

### Frontend Commands

```bash
# Install dependencies
docker-compose exec frontend npm install

# Run tests
docker-compose exec frontend npm test

# Run tests with coverage
docker-compose exec frontend npm run test:coverage

# Run linter
docker-compose exec frontend npm run lint

# Run TypeScript checks
docker-compose exec frontend npm run type-check

# Build production bundle
docker-compose exec frontend npm run build

# Run Cypress (headless)
docker-compose exec frontend npm run cypress:run

# Run Cypress (interactive)
docker-compose exec frontend npm run cypress:open
```

### Database Commands

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d donation_tracker_development

# Create database backup
docker-compose exec db pg_dump -U postgres donation_tracker_development > backup.sql

# Restore from backup
docker-compose exec -T db psql -U postgres donation_tracker_development < backup.sql

# Check database size
docker-compose exec db psql -U postgres -c "\l+"

# List all tables
docker-compose exec db psql -U postgres -d donation_tracker_development -c "\dt"
```

### Redis Commands

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check Redis memory usage
docker-compose exec redis redis-cli INFO memory

# Flush all Redis data
docker-compose exec redis redis-cli FLUSHALL
```

---

## Environment Variables

### Required Variables

**Backend (.env):**
```bash
DATABASE_URL=postgres://postgres:password@db:5432/donation_tracker_development
REDIS_URL=redis://redis:6379/0
RAILS_ENV=development
SECRET_KEY_BASE=<generate_with_rails_secret>
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:3001
NODE_ENV=development
PORT=3000
```

### Generating Secrets

```bash
# Generate Rails secret key base
docker-compose exec api rails secret

# Generate random password
openssl rand -base64 32
```

---

## Docker Compose Configuration Example

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: donation_tracker_development
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./donation_tracker_api
    command: bundle exec rails server -b 0.0.0.0
    volumes:
      - ./donation_tracker_api:/app
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/donation_tracker_development
      REDIS_URL: redis://redis:6379/0
      RAILS_ENV: development

  frontend:
    build: ./donation_tracker_frontend
    command: npm start
    volumes:
      - ./donation_tracker_frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - api
    environment:
      REACT_APP_API_URL: http://localhost:3001
      NODE_ENV: development
      CHOKIDAR_USEPOLLING: true
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

volumes:
  postgres_data:

networks:
  default:
    name: donation_tracker_network
```

---

## Production Considerations

### Security

- Use secrets management (Docker secrets or environment variables)
- Never commit .env files to version control
- Use read-only volumes where possible
- Run containers as non-root users
- Enable security scanning (Trivy, Clair)

### Performance

- Use multi-stage builds to reduce image size
- Enable caching for faster builds
- Use Alpine images where possible
- Optimize layer ordering in Dockerfiles
- Enable BuildKit for parallel builds

### Reliability

- Implement health checks for all services
- Set restart policies (restart: unless-stopped)
- Use resource limits to prevent resource exhaustion
- Monitor container resource usage
- Implement graceful shutdown handling

---

*Last updated: 2025-10-21*
