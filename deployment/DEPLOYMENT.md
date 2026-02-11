# Production Deployment Guide

Complete step-by-step guide for deploying Donation Tracker to production.

**Target Environment:** Ubuntu 22.04 LTS server (Digital Ocean, AWS, or similar VPS)

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
- [ ] Database password (strong, 16+ characters)
- [ ] Google OAuth credentials (see TICKET-136)

### Server Requirements

- Ubuntu 22.04 LTS
- 2-4 GB RAM
- 2 vCPUs
- 50 GB SSD storage
- Root or sudo access

---

## Server Setup

### Step 1: Initial Server Configuration

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update system packages
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone America/Los_Angeles

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Setup SSH key for deploy user
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Disable password authentication (SSH key only)
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### Step 2: Install Dependencies

```bash
# Switch to deploy user
su - deploy

# Install system packages
sudo apt install -y git curl build-essential libssl-dev zlib1g-dev \
  libreadline-dev libyaml-dev libffi-dev libpq-dev postgresql \
  postgresql-contrib nginx certbot python3-certbot-nginx

# Install rbenv (Ruby version manager)
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/HEAD/bin/rbenv-installer | bash

# Add rbenv to bashrc
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install Ruby 3.4.2
rbenv install 3.4.2
rbenv global 3.4.2

# Verify Ruby installation
ruby -v  # Should show ruby 3.4.2

# Install Bundler
gem install bundler

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node installation
node -v  # Should show v20.x
npm -v   # Should show 10.x
```

### Step 3: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database user
createuser donation_tracker

# Set password for database user
psql -c "ALTER USER donation_tracker WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';"

# Create production database
createdb -O donation_tracker donation_tracker_production

# Exit postgres user
exit

# Verify database connection
psql -U donation_tracker -h localhost donation_tracker_production
# (Enter password when prompted, then \q to quit)
```

### Step 4: Configure Firewall

```bash
# Setup UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verify firewall status
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
# Navigate to API directory
cd /var/www/donation-tracker/donation_tracker_api

# Copy environment template
cp ../deployment/.env.production.example .env.production

# Generate secrets
SECRET_KEY_BASE=$(bundle exec rails secret)
JWT_SECRET_KEY=$(bundle exec rails secret)

# Edit environment file
nano .env.production
```

**Required Environment Variables:**

```bash
RAILS_ENV=production
DATABASE_URL=postgresql://donation_tracker:YOUR_DB_PASSWORD@localhost/donation_tracker_production
SECRET_KEY_BASE=<paste generated SECRET_KEY_BASE>
JWT_SECRET_KEY=<paste generated JWT_SECRET_KEY>
CORS_ALLOWED_ORIGINS=https://donations.projectsforasia.com
FRONTEND_URL=https://donations.projectsforasia.com
GOOGLE_CLIENT_ID=<from TICKET-136>
GOOGLE_CLIENT_SECRET=<from TICKET-136>
WEB_CONCURRENCY=2
RAILS_MAX_THREADS=5
PORT=3001
```

**Secure the file:**

```bash
chmod 600 .env.production
```

### Step 3: Install Backend Dependencies

```bash
cd /var/www/donation-tracker/donation_tracker_api

# Install gems (excluding development and test)
bundle install --without development test

# Setup database
RAILS_ENV=production bundle exec rails db:create
RAILS_ENV=production bundle exec rails db:migrate
RAILS_ENV=production bundle exec rails db:seed

# Precompile assets (if needed)
RAILS_ENV=production bundle exec rails assets:precompile
```

### Step 4: Build Frontend

```bash
cd /var/www/donation-tracker/donation_tracker_frontend

# Install dependencies
npm install

# Build production bundle
REACT_APP_API_URL=https://donations.projectsforasia.com npm run build

# Verify build directory exists
ls -la build/
```

### Step 5: Install System Services

```bash
# Run automated setup script
cd /var/www/donation-tracker
sudo bash deployment/scripts/deploy.sh --initial
```

**Or manually:**

```bash
# Create Puma log directory
sudo mkdir -p /var/log/puma
sudo chown deploy:deploy /var/log/puma

# Install Nginx configuration
sudo cp deployment/nginx/donation-tracker.conf /etc/nginx/sites-available/donation-tracker
sudo ln -sf /etc/nginx/sites-available/donation-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Puma systemd service
sudo cp deployment/systemd/puma.service /etc/systemd/system/puma.service
sudo systemctl daemon-reload
sudo systemctl enable puma
sudo systemctl start puma

```

### Step 6: Verify Services

```bash
# Check Puma status
sudo systemctl status puma

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# View Puma logs
sudo journalctl -u puma -n 50

# Test API health endpoint
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

---

## SSL Configuration

### Step 1: Obtain SSL Certificate

```bash
# Run Certbot
sudo certbot --nginx -d donations.projectsforasia.com

# Follow prompts:
# - Enter email address
# - Agree to Terms of Service
# - Choose whether to share email with EFF
# - Select: Redirect HTTP to HTTPS (option 2)
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

### Step 3: Configure Auto-Renewal

Certbot automatically installs a systemd timer for renewal. Verify:

```bash
sudo systemctl list-timers | grep certbot
```

---

## Post-Deployment Testing

### Smoke Tests

```bash
# 1. Homepage loads
curl -I https://donations.projectsforasia.com
# Should return: 200 OK

# 2. API health check
curl https://donations.projectsforasia.com/api/health
# Should return: {"status":"ok"}

# 3. Frontend assets load
curl https://donations.projectsforasia.com/static/js/main.*.js
# Should return: 200 OK

# 4. Login page loads
curl https://donations.projectsforasia.com/login
# Should return: 200 OK
```

### Manual Testing Checklist

Open browser and navigate to: `https://donations.projectsforasia.com`

- [ ] Homepage loads without errors
- [ ] No JavaScript console errors
- [ ] Login page accessible
- [ ] Dev login works (login with `admin@projectsforasia.com`)
- [ ] Can view donors page
- [ ] Can create a donor
- [ ] Can view donations page
- [ ] Can create a donation
- [ ] Can view children page
- [ ] Can create a child
- [ ] Pagination works
- [ ] Search/filters work
- [ ] Can logout

### Security Testing

```bash
# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=donations.projectsforasia.com
# Target: A+ rating

# Security headers check
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

# Run deployment script
cd /var/www/donation-tracker
bash deployment/scripts/deploy.sh

# Or manually:
git pull origin master
cd donation_tracker_api && bundle install && RAILS_ENV=production bundle exec rails db:migrate
cd ../donation_tracker_frontend && npm install && npm run build
sudo systemctl restart puma
```

### Monitor Logs

```bash
# Puma logs
sudo journalctl -u puma -f

# Nginx access logs
sudo tail -f /var/log/nginx/donation-tracker-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/donation-tracker-error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Database Backups

**Using DigitalOcean Automated Backups:**

Backups are handled automatically by DigitalOcean Droplet Backups:
- **Frequency:** Weekly automated backups
- **Retention:** 4 backups retained
- **Location:** Droplet settings → Backups tab
- **Restore:** Droplet → Destroy → Create from backup

**Manual Database Backup (if needed):**

```bash
# Create manual backup
pg_dump -U donation_tracker donation_tracker_production | gzip > ~/db_backup_$(date +%Y%m%d).sql.gz

# Restore from manual backup
gunzip -c ~/db_backup_YYYYMMDD.sql.gz | psql -U donation_tracker donation_tracker_production
```

---

## Troubleshooting

### Puma Won't Start

```bash
# Check logs
sudo journalctl -u puma -n 100

# Common issues:
# 1. Database connection failed - verify DATABASE_URL in .env.production
# 2. Missing SECRET_KEY_BASE - verify .env.production has all required vars
# 3. Port 3001 already in use - kill process: sudo lsof -ti:3001 | xargs sudo kill

# Restart Puma
sudo systemctl restart puma
```

### 502 Bad Gateway

```bash
# Check if Puma is running
sudo systemctl status puma

# Check Nginx error logs
sudo tail -f /var/log/nginx/donation-tracker-error.log

# Verify port 3001 is listening
sudo netstat -tlnp | grep 3001

# Restart both services
sudo systemctl restart puma nginx
```

### Database Connection Errors

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -U donation_tracker -h localhost donation_tracker_production

# Check DATABASE_URL format
cat /var/www/donation-tracker/donation_tracker_api/.env.production | grep DATABASE_URL
# Format: postgresql://donation_tracker:PASSWORD@localhost/donation_tracker_production
```

### Frontend Not Loading

```bash
# Verify build directory exists
ls -la /var/www/donation-tracker/donation_tracker_frontend/build/

# Rebuild frontend
cd /var/www/donation-tracker/donation_tracker_frontend
npm run build

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL Certificate Issues

```bash
# Verify certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx SSL configuration
sudo nano /etc/nginx/sites-available/donation-tracker

# Reload Nginx
sudo systemctl reload nginx
```

---

## Next Steps

After successful deployment:

1. **Complete TICKET-136:** Configure production Google OAuth credentials
2. **Monitor:** Set up UptimeRobot or similar monitoring
3. **Verify Backups:** Confirm DigitalOcean automated backups are enabled
4. **Documentation:** Update team wiki with production details
5. **Access:** Provide production URL to team

---

## Support

- **GitHub Issues:** https://github.com/YOUR_ORG/DonationTracker/issues
- **Documentation:** `/docs/project/deployment.md`
- **Tickets:** TICKET-137 (Infrastructure), TICKET-136 (OAuth)

---

**Last Updated:** 2025-02-11
**Ticket:** TICKET-137
