# Production Deployment Guide (Docker)

**Simplified Docker-based deployment for Donation Tracker**

This guide uses Docker Compose for deployment, which is faster, simpler, and matches your development environment.

**Target:** 512MB RAM / 1 CPU / 10GB SSD (DigitalOcean Droplet or similar)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [SSL Configuration](#ssl-configuration)
5. [Post-Deployment Testing](#post-deployment-testing)
6. [Ongoing Deployments](#ongoing-deployments)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Information

- [ ] Production server IP address
- [ ] Domain name: `donations.projectsforasia.com`
- [ ] DNS A record pointing to server IP
- [ ] SSH key for server access
- [ ] Strong database password (16+ characters)
- [ ] Google OAuth credentials (TICKET-136)
- [ ] DigitalOcean Droplet Backups enabled

### Server Requirements

- Ubuntu 22.04 LTS
- 512MB RAM minimum (1GB recommended)
- 1-2 vCPUs
- 10GB SSD storage
- Root or sudo access

---

## Server Setup

### Step 1: Initial Server Configuration

```bash
# SSH into server as root
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone America/Los_Angeles

# Create deploy user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy  # Will add docker group in next step

# Setup SSH keys for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Disable password authentication (SSH key only)
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Test deploy user access (in new terminal before closing root session)
# ssh deploy@YOUR_SERVER_IP
```

### Step 2: Install Docker

```bash
# Switch to deploy user
su - deploy

# Install Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify Docker installation
docker --version
docker compose version

# Verify deploy user can run Docker
docker ps
```

### Step 3: Install Nginx & Certbot

```bash
# Install packages
sudo apt install -y nginx certbot python3-certbot-nginx

# Verify Nginx installation
sudo nginx -v
sudo systemctl status nginx
```

### Step 4: Enable Swap (Critical for 512MB RAM)

```bash
# Create 1GB swap file
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Configure swap usage (use less swap, prefer RAM)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify swap
free -h
swapon --show
```

### Step 5: Configure Firewall

```bash
# Setup UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verify
sudo ufw status
```

---

## Application Deployment

### Step 1: Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/donation-tracker
sudo chown deploy:deploy /var/www/donation-tracker

# Clone repository
cd /var/www
git clone https://github.com/YOUR_ORG/DonationTracker.git donation-tracker
cd donation-tracker
```

### Step 2: Configure Environment Variables

```bash
# Copy template and edit
cp .env.production.example .env
nano .env
```

**Fill in these values:**

```bash
# Database
DB_USER=donation_tracker
DB_PASSWORD=<STRONG_PASSWORD_16_CHARS>
DB_NAME=donation_tracker_production

# Rails secrets (generate with: docker compose run --rm api bundle exec rails secret)
SECRET_KEY_BASE=<GENERATED_SECRET>
JWT_SECRET_KEY=<GENERATED_SECRET>

# Domain
CORS_ALLOWED_ORIGINS=https://donations.projectsforasia.com
FRONTEND_URL=https://donations.projectsforasia.com

# OAuth (from TICKET-136)
GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
```

**Generate secrets:**

```bash
# Generate SECRET_KEY_BASE
docker compose run --rm api bundle exec rails secret

# Generate JWT_SECRET_KEY
docker compose run --rm api bundle exec rails secret

# Copy these into .env file
```

**Secure the file:**

```bash
chmod 600 .env
```

### Step 3: Build and Start Containers

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Wait for "Puma starting" message, then Ctrl+C to exit logs
```

### Step 4: Initialize Database

```bash
# Create and seed database (done automatically on first start)
# Check logs to verify:
docker compose -f docker-compose.prod.yml logs api | grep -i "database"

# If needed, run manually:
docker compose -f docker-compose.prod.yml exec api bundle exec rails db:seed
```

### Step 5: Build Frontend

```bash
# Build React frontend locally (requires Node.js on your dev machine)
cd donation_tracker_frontend
npm install
REACT_APP_API_URL=https://donations.projectsforasia.com npm run build

# Copy build to server
scp -r build/* deploy@YOUR_SERVER_IP:/var/www/donation-tracker/donation_tracker_frontend/build/

# Create build directory on server (if needed)
# ssh deploy@YOUR_SERVER_IP "mkdir -p /var/www/donation-tracker/donation_tracker_frontend/build"
```

### Step 6: Configure Nginx

```bash
# On server, install Nginx config
sudo cp deployment/nginx/donation-tracker.conf /etc/nginx/sites-available/donation-tracker
sudo ln -sf /etc/nginx/sites-available/donation-tracker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Verify Services

```bash
# Check containers
docker compose -f docker-compose.prod.yml ps

# Check API health
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}

# Check Nginx
curl http://localhost
# Should return React app HTML
```

---

## SSL Configuration

### Step 1: Obtain SSL Certificate

```bash
# Run Certbot (make sure DNS A record points to server first)
sudo certbot --nginx -d donations.projectsforasia.com

# Follow prompts:
# - Enter email address
# - Agree to Terms of Service
# - Choose whether to share email with EFF
# - Select: Redirect HTTP to HTTPS
```

### Step 2: Verify SSL

```bash
# Check certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run

# Verify HTTPS works
curl https://donations.projectsforasia.com/api/health
```

### Step 3: Auto-Renewal

Certbot automatically installs a systemd timer:

```bash
# Verify timer is active
sudo systemctl list-timers | grep certbot
```

---

## Post-Deployment Testing

### Smoke Tests

```bash
# 1. HTTPS homepage
curl -I https://donations.projectsforasia.com
# Should return: 200 OK

# 2. API health
curl https://donations.projectsforasia.com/api/health
# Should return: {"status":"ok"}

# 3. Container status
docker compose -f docker-compose.prod.yml ps
# All should show "Up"

# 4. Check memory usage
free -h
docker stats --no-stream
```

### Manual Testing Checklist

Open browser: `https://donations.projectsforasia.com`

- [ ] Homepage loads without errors
- [ ] No JavaScript console errors
- [ ] Login page accessible
- [ ] Dev login works (before OAuth setup)
- [ ] Can create/view/edit donors
- [ ] Can create/view/edit donations
- [ ] Can create/view/edit children
- [ ] Pagination works
- [ ] Search/filters work
- [ ] Can logout

### Security Testing

```bash
# SSL Labs test (aim for A+ rating)
# https://www.ssllabs.com/ssltest/analyze.html?d=donations.projectsforasia.com

# Security headers
curl -I https://donations.projectsforasia.com | grep -E "Strict-Transport|X-Frame|X-Content"

# Verify HTTP redirects to HTTPS
curl -I http://donations.projectsforasia.com
# Should return: 301 Moved Permanently
```

---

## Ongoing Deployments

### Deploy Updates

```bash
# SSH into server
ssh deploy@YOUR_SERVER_IP
cd /var/www/donation-tracker

# Pull latest code
git pull origin master

# Rebuild and restart
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d

# Run migrations (if any)
docker compose -f docker-compose.prod.yml exec api bundle exec rails db:migrate

# Rebuild frontend (on your dev machine)
cd donation_tracker_frontend
npm run build
scp -r build/* deploy@YOUR_SERVER_IP:/var/www/donation-tracker/donation_tracker_frontend/build/
```

### Monitor Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# API logs only
docker compose -f docker-compose.prod.yml logs -f api

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# Nginx logs (on host)
sudo tail -f /var/log/nginx/donation-tracker-access.log
sudo tail -f /var/log/nginx/donation-tracker-error.log
```

### Database Backups

**DigitalOcean Automated Backups (Primary):**

- Backups handled by DO Droplet Backups
- Weekly automated snapshots
- 4 backups retained
- Restore: Destroy Droplet → Create from backup

**Manual Database Backup (if needed):**

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U donation_tracker donation_tracker_production | gzip > ~/db_backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip -c ~/db_backup_YYYYMMDD.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U donation_tracker donation_tracker_production
```

---

## Troubleshooting

### Containers Won't Start

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs postgres

# Common issues:
# 1. Missing .env file - verify: ls -la .env
# 2. Wrong DATABASE_URL - check .env file
# 3. Port 3001 in use - check: sudo lsof -i:3001
```

### 502 Bad Gateway

```bash
# Check if API container is running
docker compose -f docker-compose.prod.yml ps api

# Check API logs
docker compose -f docker-compose.prod.yml logs api

# Check if API is responding
curl http://localhost:3001/api/health

# Restart services
docker compose -f docker-compose.prod.yml restart api
sudo systemctl restart nginx
```

### Database Connection Errors

```bash
# Check postgres container
docker compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify DATABASE_URL in .env matches docker-compose.prod.yml
cat .env | grep DATABASE_URL

# Connect to database manually
docker compose -f docker-compose.prod.yml exec postgres psql -U donation_tracker donation_tracker_production
```

### Out of Memory

```bash
# Check memory usage
free -h
docker stats --no-stream

# Check swap usage (should be < 200MB normally)
swapon --show

# If consistently using > 200MB swap:
# 1. Verify WEB_CONCURRENCY=0 in docker-compose.prod.yml
# 2. Verify RAILS_MAX_THREADS=2
# 3. Consider upgrading to 1GB RAM ($6/month)
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
sudo systemctl reload nginx
```

### Rebuild Everything (Nuclear Option)

```bash
# Stop and remove containers
docker compose -f docker-compose.prod.yml down

# Remove volumes (CAREFUL: deletes database!)
docker compose -f docker-compose.prod.yml down -v

# Rebuild from scratch
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## Resource Monitoring

### Memory Usage

```bash
# System memory
free -h

# Container memory
docker stats --no-stream

# Expected usage (512MB total):
# - postgres: 60-80MB
# - api: 120-150MB
# - System/cache: 200-250MB
# - Swap: 0-200MB (normal), 200-500MB (upgrade soon)
```

### Disk Usage

```bash
# Overall disk usage
df -h

# Docker disk usage
docker system df

# Clean up old images/containers
docker system prune -a
```

---

## Next Steps

After successful deployment:

1. **Complete TICKET-136:** Configure production Google OAuth credentials
2. **Monitor:** Set up UptimeRobot for uptime monitoring
3. **Verify Backups:** Confirm DO automated backups are enabled
4. **Test Restore:** Practice restoring from a backup
5. **Documentation:** Share production URL with team

---

## Quick Reference

### Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d

# Run Rails console
docker compose -f docker-compose.prod.yml exec api bundle exec rails console

# Run migrations
docker compose -f docker-compose.prod.yml exec api bundle exec rails db:migrate

# Check container status
docker compose -f docker-compose.prod.yml ps
```

---

## Support

- **GitHub Issues:** https://github.com/YOUR_ORG/DonationTracker/issues
- **Tickets:** TICKET-137 (Infrastructure), TICKET-136 (OAuth)

---

**Last Updated:** 2025-02-11
**Ticket:** TICKET-137
