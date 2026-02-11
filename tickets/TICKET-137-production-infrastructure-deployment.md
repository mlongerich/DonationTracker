## [TICKET-137] Production Infrastructure & Deployment

**Status:** 📋 Planned
**Priority:** 🔴 High
**Category:** Infrastructure / DevOps
**Dependencies:** TICKET-008 (Google OAuth - complete)
**Blocks:** TICKET-136 (Production OAuth Setup)
**Estimated Effort:** L (8-12 hours)

### User Story
As a system administrator, I want to deploy the Donation Tracker application to production infrastructure so that the organization can use it for real donation management.

### Context
The application is complete with authentication (TICKET-008) and all core features. Production deployment requires server setup, database configuration, SSL certificates, and environment configuration. TICKET-136 (Google OAuth credentials) will be completed during/after this ticket once the production domain is confirmed.

### Acceptance Criteria

#### Infrastructure Setup
- [ ] Production server provisioned (VPS: Digital Ocean, AWS, etc.)
- [ ] Domain name configured and DNS pointing to server
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] PostgreSQL 15 installed and configured
- [ ] Redis installed and configured
- [ ] Nginx configured as reverse proxy
- [ ] Firewall configured (SSH, HTTP, HTTPS only)

#### Application Deployment
- [ ] Repository cloned to production server
- [ ] Ruby 3.4.2 installed via rbenv
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed (`bundle install --without development test`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend built for production (`npm run build`)
- [ ] Static files served via Nginx

#### Database & Migrations
- [ ] Production database created
- [ ] All migrations run (`rails db:migrate`)
- [ ] Seed data loaded (`rails db:seed` - creates admin user)
- [ ] Database backups configured (daily automated backups)

#### Environment Configuration
- [ ] All environment variables set (see checklist below)
- [ ] `config/master.key` securely transferred (NOT in git)
- [ ] `SECRET_KEY_BASE` generated (`rails secret`)
- [ ] JWT_SECRET_KEY generated
- [ ] CORS configured for production domain
- [ ] Frontend API URL configured

#### Process Management
- [ ] Puma configured with systemd service
- [ ] Puma service enabled and running
- [ ] Redis service enabled and running
- [ ] PostgreSQL service enabled and running
- [ ] Nginx service enabled and running
- [ ] Services configured to auto-restart on failure

#### Security
- [ ] Firewall rules configured (ufw or iptables)
- [ ] SSH key-only authentication (password login disabled)
- [ ] Production master.key stored securely (password manager)
- [ ] Database credentials stored securely
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers configured in Nginx

#### Monitoring & Logging
- [ ] Application logs configured (Rails production.log)
- [ ] Nginx access and error logs configured
- [ ] PostgreSQL logs configured
- [ ] Log rotation configured (logrotate)
- [ ] Server monitoring set up (optional: UptimeRobot, Pingdom)

#### Testing
- [ ] Application accessible via production domain
- [ ] Dev login works (before OAuth setup)
- [ ] Can create/view/edit donors, donations, children
- [ ] Database queries perform well (check slow query log)
- [ ] SSL certificate valid and HTTPS working
- [ ] Frontend assets loading correctly
- [ ] No console errors in browser

### Environment Variables Checklist

```bash
# Required for deployment
RAILS_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/donation_tracker_production
REDIS_URL=redis://localhost:6379/0
SECRET_KEY_BASE=<generate with rails secret>
JWT_SECRET_KEY=<generate with rails secret>
CORS_ALLOWED_ORIGINS=https://donations.projectsforasia.com
FRONTEND_URL=https://donations.projectsforasia.com

# OAuth (set during TICKET-136)
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Future (when implemented)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Technical Notes

**Recommended Hosting:**
- **Platform:** Digital Ocean Droplet ($12-24/month) or AWS Lightsail
- **Specs:** 2-4GB RAM, 2 vCPUs, 50GB SSD
- **Location:** Choose closest to organization's location
- **Backups:** Enable automated backups ($2-4/month)

**Domain Configuration:**
- **Primary:** `donations.projectsforasia.com` (frontend + backend)
- **Alternative:** Separate subdomains (frontend: `donations.`, backend: `api.donations.`)
- **DNS:** A record pointing to server IP
- **SSL:** Let's Encrypt (free, auto-renewal via certbot)

**Nginx Configuration:**
```nginx
# Frontend (React build)
server {
    listen 80;
    server_name donations.projectsforasia.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name donations.projectsforasia.com;

    ssl_certificate /etc/letsencrypt/live/donations.projectsforasia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/donations.projectsforasia.com/privkey.pem;

    root /var/www/donation-tracker/donation_tracker_frontend/build;
    index index.html;

    # API reverse proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /auth {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri /index.html;
    }
}
```

**Puma Systemd Service:**
```ini
# /etc/systemd/system/puma.service
[Unit]
Description=Puma Rails Server
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/donation-tracker/donation_tracker_api
ExecStart=/home/deploy/.rbenv/shims/bundle exec puma -C config/puma.rb
Restart=always

[Install]
WantedBy=multi-user.target
```

**Database Backup Script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh
BACKUP_DIR="/var/backups/donation-tracker"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump donation_tracker_production | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

**Post-Deployment Workflow:**
1. Deploy infrastructure (this ticket)
2. Verify dev login works
3. Complete TICKET-136 (configure real Google OAuth)
4. Test authentication with real @projectsforasia.com email
5. Monitor logs for first 24-48 hours

### Files Changed/Created

**Server Configuration (New):**
- `/etc/nginx/sites-available/donation-tracker` - Nginx config
- `/etc/systemd/system/puma.service` - Puma service
- `/usr/local/bin/backup-database.sh` - Database backup script
- `/etc/cron.d/donation-tracker-backup` - Daily backup cron job

**Application (Modified):**
- `donation_tracker_api/config/database.yml` - Production database config
- `donation_tracker_api/config/puma.rb` - Production puma config
- `.env.production` or equivalent (NOT committed to git)

**Documentation:**
- `docs/project/deployment.md` - Updated with actual production details
- `TICKET-136-production-google-oauth-setup.md` - Update with production domain

### Out of Scope
- Stripe webhook configuration (TICKET-026 - future)
- Email configuration (future - when implemented)
- CDN setup (future optimization)
- Multi-region deployment (future scalability)
- Docker production deployment (current: traditional VPS)

### Testing Checklist

**Pre-Deployment:**
- [ ] All tests passing locally (backend: 413 tests, frontend: 450 tests, E2E: 105 tests)
- [ ] No RuboCop violations
- [ ] No ESLint warnings
- [ ] Coverage meets thresholds (90% backend, 80% frontend)

**Post-Deployment:**
- [ ] Homepage loads (HTTPS)
- [ ] Login page accessible
- [ ] Dev login works
- [ ] Can create a donor
- [ ] Can create a donation
- [ ] Can create a child
- [ ] Pagination works
- [ ] Search/filters work
- [ ] No JavaScript console errors
- [ ] SSL certificate valid (A+ rating on SSL Labs)

### Related Tickets
- TICKET-008: Google OAuth Authentication - ✅ Complete (authentication foundation)
- TICKET-136: Production Google OAuth Setup - 📋 Ready (blocked by this ticket - needs production domain)

### Definition of Done
- Production server accessible via HTTPS
- Application running and responding
- All core features working (donors, donations, children, sponsorships)
- Dev login functional (admin@projectsforasia.com)
- Database backups configured
- Logs accessible and rotating
- Documentation updated with production details
- Ready for TICKET-136 (OAuth credential configuration)

---

**Estimated Time Breakdown:**
- Server setup & configuration: 3-4 hours
- Application deployment: 2-3 hours
- Database & migrations: 1 hour
- SSL & Nginx: 1-2 hours
- Testing & verification: 2 hours
- **Total:** 9-12 hours

**Notes:**
- This is a one-time setup ticket
- Future deployments will be faster (git pull + restart services)
- Consider setting up CI/CD pipeline in future (GitHub Actions)
