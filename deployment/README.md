# Deployment Configuration

Production deployment files and scripts for Donation Tracker.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

**Fastest and simplest - matches development environment**

```bash
# On your production server
cd /var/www/donation-tracker
docker compose -f docker-compose.prod.yml up -d
```

**See:** [DEPLOYMENT-DOCKER.md](DEPLOYMENT-DOCKER.md) - Complete Docker deployment guide

### Option 2: Traditional Deployment

**Manual installation of Ruby, PostgreSQL, Nginx, etc.**

```bash
# On your production server (as deploy user)
cd /var/www/donation-tracker
sudo bash deployment/scripts/deploy.sh --initial
```

**See:** [DEPLOYMENT.md](DEPLOYMENT.md) - Traditional deployment guide (for reference)

## Directory Structure

```
deployment/
├── README.md                      # This file
├── DEPLOYMENT-DOCKER.md           # Docker deployment guide (RECOMMENDED)
├── DEPLOYMENT.md                  # Traditional deployment guide (reference)
├── nginx/
│   └── donation-tracker.conf     # Nginx configuration
├── systemd/
│   └── puma.service              # Puma systemd service (traditional only)
└── scripts/
    └── deploy.sh                 # Traditional deployment script

Root directory:
├── docker-compose.prod.yml        # Production Docker Compose config
├── .env.production.example        # Environment variables for Docker
└── donation_tracker_api/
    └── Dockerfile                # Production Docker image
```

## Files

### Docker Files (Recommended)

**docker-compose.prod.yml** (root directory)
- Production Docker Compose configuration
- Optimized for 512MB RAM / 1 CPU
- Memory limits and health checks
- Usage: `docker compose -f docker-compose.prod.yml up -d`

**donation_tracker_api/Dockerfile**
- Multi-stage production Docker image
- Optimized for size and security
- Non-root user for security
- Exposes port 3001 for Puma

**.env.production.example** (root directory)
- Environment variables for Docker deployment
- Copy to `.env` and fill in secrets
- Used by docker-compose.prod.yml

### Configuration Files

**nginx/donation-tracker.conf**
- Nginx reverse proxy configuration
- Proxies to Docker container (localhost:3001)
- HTTPS/SSL setup
- Security headers
- React Router support
- Install: `/etc/nginx/sites-available/donation-tracker`

### Traditional Deployment (Optional)

**systemd/puma.service**
- Puma systemd service (for non-Docker deployments)
- Auto-restart on failure
- Only needed if NOT using Docker

**scripts/deploy.sh**
- Traditional deployment script (for non-Docker deployments)
- Manual Ruby/PostgreSQL setup
- Usage: `bash deployment/scripts/deploy.sh [--initial]`

## Environment Variables

See `.env.production.example` for complete list. Key variables:

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost/db_name
SECRET_KEY_BASE=<generate with rails secret>
JWT_SECRET_KEY=<generate with rails secret>
CORS_ALLOWED_ORIGINS=https://donations.projectsforasia.com
FRONTEND_URL=https://donations.projectsforasia.com

# OAuth (TICKET-136)
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

## Installation Steps (Docker)

### 1. Server Setup

```bash
# Install Docker & Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Enable swap (critical for 512MB RAM)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Application Setup

```bash
# Clone repository
sudo mkdir -p /var/www/donation-tracker
sudo chown deploy:deploy /var/www/donation-tracker
git clone <repo-url> /var/www/donation-tracker
cd /var/www/donation-tracker

# Configure environment
cp .env.production.example .env
nano .env  # Fill in all values

# Generate secrets
docker compose run --rm api bundle exec rails secret  # Copy to SECRET_KEY_BASE
docker compose run --rm api bundle exec rails secret  # Copy to JWT_SECRET_KEY

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### 3. Nginx & SSL Setup

```bash
# Install Nginx config
sudo cp deployment/nginx/donation-tracker.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d donations.projectsforasia.com
```

**See [DEPLOYMENT-DOCKER.md](DEPLOYMENT-DOCKER.md) for complete step-by-step guide.**

## Daily Operations (Docker)

### Deploy Updates

```bash
ssh deploy@YOUR_SERVER
cd /var/www/donation-tracker

# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d

# Run migrations (if any)
docker compose -f docker-compose.prod.yml exec api bundle exec rails db:migrate
```

### View Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# API logs only
docker compose -f docker-compose.prod.yml logs -f api

# Nginx logs (on host)
sudo tail -f /var/log/nginx/donation-tracker-access.log
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart API only
docker compose -f docker-compose.prod.yml restart api

# Reload Nginx
sudo systemctl reload nginx
```

### Database Backups

**Primary:** DigitalOcean automated backups (weekly, 4 retained)

**Manual backup (if needed):**

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U donation_tracker donation_tracker_production | gzip > ~/db_backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip -c ~/db_backup_YYYYMMDD.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U donation_tracker donation_tracker_production
```

## Documentation

- **[DEPLOYMENT-DOCKER.md](DEPLOYMENT-DOCKER.md)** - Docker deployment guide (RECOMMENDED)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Traditional deployment guide (reference)
- **[docs/project/deployment.md](../docs/project/deployment.md)** - Architecture overview
- **[TICKET-137](../tickets/TICKET-137-production-infrastructure-deployment.md)** - Implementation ticket
- **[TICKET-136](../tickets/TICKET-136-production-google-oauth-setup.md)** - OAuth setup

## Support

For issues or questions:
- GitHub Issues: https://github.com/YOUR_ORG/DonationTracker/issues
- See DEPLOYMENT.md troubleshooting section

---

**Ticket:** TICKET-137
**Last Updated:** 2025-02-11
