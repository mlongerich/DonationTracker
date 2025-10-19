# Deployment Guide

*Production infrastructure and deployment strategy*

---

## Hosting Requirements

**Platform:** Digital Ocean (or similar VPS)
**Server:** Ubuntu 22.04 LTS
**RAM:** Minimum 2GB (4GB recommended)
**Storage:** 50GB SSD
**SSL:** Let's Encrypt (free HTTPS)

---

## Production Stack

**Web Server:** Nginx (reverse proxy)
**App Server:** Puma (Rails)
**Database:** PostgreSQL 15
**Cache:** Redis
**Background Jobs:** Sidekiq
**Process Manager:** systemd

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/donation_tracker_production

# Redis
REDIS_URL=redis://localhost:6379/0

# Rails
RAILS_ENV=production
SECRET_KEY_BASE=<generate with `rails secret`>
RAILS_MASTER_KEY=<from config/master.key>

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Stripe (when implemented)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth (when implemented)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (when implemented)
SENDGRID_API_KEY=...
```

---

## Deployment Process

### Initial Setup

```bash
# 1. Install dependencies
sudo apt update
sudo apt install postgresql redis-server nginx nodejs npm

# 2. Install Ruby via rbenv
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/main/bin/rbenv-installer | bash
rbenv install 3.4.2
rbenv global 3.4.2

# 3. Clone repository
git clone <repo-url>
cd DonationTracker

# 4. Setup backend
cd donation_tracker_api
bundle install --without development test
RAILS_ENV=production rails db:create db:migrate db:seed

# 5. Setup frontend
cd ../donation_tracker_frontend
npm install
REACT_APP_API_URL=https://api.yourdomain.com npm run build

# 6. Configure Nginx
sudo cp deployment/nginx.conf /etc/nginx/sites-available/donation-tracker
sudo ln -s /etc/nginx/sites-available/donation-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. Setup SSL
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# 8. Start services
sudo systemctl enable puma
sudo systemctl start puma
sudo systemctl enable sidekiq
sudo systemctl start sidekiq
```

### Ongoing Deployments

```bash
# 1. Pull latest code
git pull origin main

# 2. Update backend
cd donation_tracker_api
bundle install
RAILS_ENV=production rails db:migrate
sudo systemctl restart puma

# 3. Update frontend
cd ../donation_tracker_frontend
npm install
REACT_APP_API_URL=https://api.yourdomain.com npm run build
sudo cp -r build/* /var/www/donation-tracker/
```

---

## Database Backups

**Strategy:** Daily automated backups with 30-day retention

```bash
# Backup script (add to cron)
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump -U donation_tracker donation_tracker_production | gzip > /backups/db-$DATE.sql.gz

# Keep last 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

**Cron Job:**
```bash
# Run daily at 2am
0 2 * * * /path/to/backup-script.sh
```

---

## Monitoring

**Application Monitoring:** New Relic or Honeybadger
**Server Monitoring:** Digital Ocean monitoring + alerts
**Uptime Monitoring:** UptimeRobot or similar
**Log Aggregation:** Papertrail or Logz.io

---

## Data Import Plan

### Stripe Historical Data

```bash
# 1. Export donors from Stripe CSV
# 2. Import via rake task
RAILS_ENV=production rails donors:import[stripe_export.csv]

# 3. Manually create sponsorships (until automated)
# 4. Import historical donations via custom script
```

### Migration Strategy

1. **Phase 1:** Import all donors (CSV)
2. **Phase 2:** Create children records manually
3. **Phase 3:** Link existing sponsorships
4. **Phase 4:** Import historical donations
5. **Phase 5:** Validate data integrity
6. **Phase 6:** Go live with Stripe webhooks

---

## Security Checklist

- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (UFW)
- [ ] Database password strong and rotated
- [ ] SSH key-only authentication
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Secrets not in Git history
- [ ] Regular security updates
- [ ] Backup encryption

---

## Rollback Procedure

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Rollback database (if needed)
RAILS_ENV=production rails db:rollback STEP=1

# 3. Rebuild frontend
cd donation_tracker_frontend
npm run build
sudo cp -r build/* /var/www/donation-tracker/

# 4. Restart services
sudo systemctl restart puma
```

---

## Related Documentation

- **[Tech Stack](tech-stack.md)** - Infrastructure components
- **[Data Models](data-models.md)** - Database schema
- **[API Endpoints](api-endpoints.md)** - API reference
