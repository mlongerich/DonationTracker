## [TICKET-138] Automated Deployment Script

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Created:** 2026-02-18

### User Story
As a developer, I want an automated deployment script that detects which components have changed and deploys only what's necessary, so that I can deploy updates quickly and safely without manual steps.

### Problem Statement
Current deployment process is manual and error-prone:
- Must manually determine if backend or frontend changed
- Backend: Rebuild container, run migrations, restart services
- Frontend: Build locally, SCP files, set permissions, reload nginx
- Easy to miss steps (migrations, permissions, nginx reload)
- No pre-deployment validation or post-deployment health checks
- No rollback strategy if deployment fails

### Acceptance Criteria
- [ ] Script detects which components changed (backend/frontend/docker/nginx)
- [ ] Backend deployment: Build container, run migrations, restart services
- [ ] Frontend deployment: Build locally, SCP to server, set permissions, reload nginx
- [ ] Pre-deployment checks: Tests pass, linting clean, disk space sufficient
- [ ] Database backup before migrations
- [ ] Health checks after deployment
- [ ] Rollback mechanism if deployment fails
- [ ] Notification on success/failure (stdout/stderr)
- [ ] Docker image tagging for version tracking
- [ ] Environment variable updates if .env changed
- [ ] SSL certificate renewal check
- [ ] All deployment steps logged for troubleshooting

### Technical Details

#### Change Detection Logic
```bash
# Determine what changed since last deployment
BACKEND_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^donation_tracker_api/|^docker-compose.prod.yml|^Dockerfile' || true)
FRONTEND_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^donation_tracker_frontend/(src|public)/' || true)
MIGRATIONS_EXIST=$(git diff --name-only HEAD~1 HEAD | grep -E '^donation_tracker_api/db/migrate/' || true)
NGINX_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E 'nginx' || true)
ENV_CHANGED=$(git diff --name-only HEAD~1 HEAD | grep -E '^\.env' || true)
```

#### Backend Deployment Steps
1. **Pre-deployment:**
   - Run backend tests (`scripts/test-backend.sh`)
   - Run linting (`docker compose -f docker-compose.prod.yml exec api bundle exec rubocop`)
   - Check disk space (`df -h`)
2. **Backup:**
   - Database backup (`pg_dump` to timestamped file)
3. **Build & Deploy:**
   - Build API container (`docker compose -f docker-compose.prod.yml build api`)
   - Tag image with version (`docker tag api:latest api:$(git rev-parse --short HEAD)`)
   - Stop container (`docker compose -f docker-compose.prod.yml stop api`)
   - Start container (`docker compose -f docker-compose.prod.yml up -d api`)
4. **Migrations:**
   - If migrations exist: `docker compose -f docker-compose.prod.yml exec api bundle exec rails db:migrate`
5. **Post-deployment:**
   - Health check (`curl https://donations.projectsforasia.com/api/health`)
   - Check logs for errors (`docker compose -f docker-compose.prod.yml logs api --tail 50`)

#### Frontend Deployment Steps
1. **Pre-deployment:**
   - Run frontend tests (`cd donation_tracker_frontend && npm test`)
   - Run linting (`cd donation_tracker_frontend && npm run lint`)
2. **Build:**
   - Build production bundle (`cd donation_tracker_frontend && npm run build`)
3. **Deploy:**
   - SCP files to server (`scp -r build/* user@server:/tmp/frontend-build/`)
   - Move to production location (`mv /tmp/frontend-build/* /var/www/donation-tracker/donation_tracker_frontend/build/`)
   - Set ownership (`chown -R www-data:www-data /var/www/donation-tracker/donation_tracker_frontend/build`)
   - Set permissions (`chmod -R 755 /var/www/donation-tracker/donation_tracker_frontend/build`)
   - Reload nginx (`sudo systemctl reload nginx`)
4. **Post-deployment:**
   - Health check (`curl https://donations.projectsforasia.com`)
   - Check nginx logs (`tail -50 /var/log/nginx/error.log`)

#### Rollback Mechanism
- If backend health check fails: `docker compose -f docker-compose.prod.yml stop api && docker tag api:$(git rev-parse --short HEAD~1) api:latest && docker compose -f docker-compose.prod.yml up -d api`
- If database migration fails: Restore from backup (`pg_restore`)
- If frontend health check fails: Restore previous build from backup

#### Environment Variable Updates
- If `.env` changed: Copy to server, restart containers

#### SSL Certificate Check
- Check certificate expiration: `certbot certificates`
- Alert if expiring within 30 days

#### Notification Strategy
- **Success:** Echo deployment summary (components deployed, duration, health check status)
- **Failure:** Echo error details, rollback status, suggest manual intervention steps
- **Future enhancement:** Slack/email notifications

### Additional Considerations You Mentioned
✅ Database backups before migrations
✅ Rollback strategy if deployment fails
✅ Pre-deployment checks (tests passing, linting)
✅ Health checks post-deployment
✅ Docker image tagging for version tracking
✅ SSL certificate renewal check
✅ Disk space check before build
✅ Log rotation/cleanup (optional: could add `docker system prune -f`)
✅ Environment variable updates
✅ Permissions management (frontend files)
✅ Nginx reload (frontend changes)

**Additional ideas:**
- [ ] Deployment lock file (prevent concurrent deployments)
- [ ] Dry-run mode (`--dry-run` flag to show what would be deployed)
- [ ] Skip steps flag (`--skip-tests` for emergency hotfixes)
- [ ] Deployment history log (append to `/var/log/deployment.log`)
- [ ] Database migration dry-run/preview before applying
- [ ] Container resource usage check (memory/CPU) before/after deployment

### Files to Create/Modify
- `scripts/deploy.sh` - Main deployment script
- `scripts/deploy-backend.sh` - Backend-specific deployment
- `scripts/deploy-frontend.sh` - Frontend-specific deployment
- `scripts/rollback.sh` - Rollback to previous version
- `scripts/health-check.sh` - Post-deployment validation
- `deployment/AUTOMATED-DEPLOYMENT.md` - Documentation for automated deployment

### Testing Plan
1. Test backend-only deployment (change API code)
2. Test frontend-only deployment (change React code)
3. Test full-stack deployment (change both)
4. Test migration deployment (add migration file)
5. Test rollback mechanism (simulate failed deployment)
6. Test environment variable updates
7. Test disk space check (simulate low disk space)
8. Test pre-deployment checks (simulate failing tests)

### Dependencies
- Git repository on server (`/var/www/donation-tracker`)
- Docker Compose production configuration
- SSH access to production server
- Nginx configuration
- PostgreSQL backup/restore tools

### Implementation Notes
- Start with basic script (change detection + deployment steps)
- Add pre-deployment checks
- Add rollback mechanism
- Add notifications
- Document all flags and options

### Success Metrics
- Deployment time reduced by 50% (manual ~10-15 minutes → automated ~5 minutes)
- Zero missed steps (migrations, permissions, nginx reload)
- Automatic rollback on failure (no manual intervention)
- Clear deployment logs for troubleshooting

### Related Tickets
- TICKET-137 (Production deployment infrastructure)
- TICKET-136 (Production OAuth setup)

### Documentation Updates Needed
- `deployment/AUTOMATED-DEPLOYMENT.md` - Usage guide for deployment script
- `CLAUDE.md` - Add deployment script reference under Development Commands
- `deployment/DEPLOYMENT-DOCKER.md` - Update manual deployment section to reference automated script

---

**Notes:**
- Script should be idempotent (can run multiple times safely)
- Use set -e for fail-fast behavior
- Colorize output for readability (green=success, red=error, yellow=warning)
- Verbose mode (`-v` flag) for debugging
