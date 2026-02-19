# Automated Deployment Guide

Complete guide for using the automated deployment scripts for the Donation Tracker application.

> **🚀 New Deployment Pattern:** This system now uses git tags + releases/symlink pattern for instant rollbacks and accurate change detection. **First-time setup required:** See [MIGRATION-TO-SYMLINK.md](./MIGRATION-TO-SYMLINK.md) for one-time Nginx configuration update.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Scripts](#deployment-scripts)
- [Testing Scenarios](#testing-scenarios)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

The automated deployment system provides:
- **Git Tag Tracking**: Tracks deployments with git tags for accurate change detection across multiple commits
- **Change Detection**: Automatically detects which components changed since last deployment
- **Releases + Symlink**: Frontend uses immutable releases with atomic symlink switching
- **Dry-Run Mode**: Preview deployments without making changes
- **Health Checks**: Automatic validation after deployment
- **Instant Rollback**: Frontend rollback in ~1 second (symlink switch)
- **Database Backups**: Automatic database backups before migrations

### Architecture

```
scripts/deploy.sh (Main Orchestrator)
    ├── Detects changes (git diff against last deployment tag)
    ├── scripts/deploy-backend.sh
    │   ├── Backup database
    │   ├── Build Docker image (tagged with git hash)
    │   ├── Run migrations
    │   └── scripts/health-check.sh api
    └── scripts/deploy-frontend.sh
        ├── Build production bundle
        ├── Deploy to timestamped release: releases/YYYYMMDD-HHMMSS/
        ├── Update symlink: current → releases/YYYYMMDD-HHMMSS
        ├── Cleanup old releases (keep last 5)
        └── scripts/health-check.sh frontend
```

**Git Tag Pattern:**
- After successful deployment, creates tag: `deployed-YYYYMMDD-HHMMSS`
- Change detection compares: `last-deployment-tag..HEAD` (not `HEAD~1`)
- Works correctly even with multiple commits between deployments

**Frontend Release Pattern:**
- Immutable releases in `/var/www/.../releases/YYYYMMDD-HHMMSS/`
- Symlink `/var/www/.../current` points to active release
- Nginx serves from `current` symlink
- Rollback = instant symlink switch (no file copying)

## Prerequisites

### Local Machine

- **Git**: For change detection
- **Node.js 18+**: For frontend builds
- **Docker**: For backend deployments
- **SSH Access**: To production server (for frontend)

### Production Server

- **Docker & Docker Compose**: Backend runtime
- **Nginx**: Frontend web server
- **PostgreSQL**: Database (in Docker)

### Environment Variables

Create a `.env` file or export these variables:

```bash
# Optional: Override default server settings
export DEPLOY_SERVER="donations.projectsforasia.com"
export DEPLOY_USER="root"
```

## Quick Start

### 1. Deploy Everything (Auto-Detect Changes)

```bash
# Preview what will be deployed
./scripts/deploy.sh --dry-run

# Deploy (will prompt for confirmation)
./scripts/deploy.sh
```

### 2. Deploy Specific Component

```bash
# Force backend deployment
./scripts/deploy.sh --force-backend

# Force frontend deployment
./scripts/deploy.sh --force-frontend

# Force both
./scripts/deploy.sh --force-all
```

### 3. Check System Health

```bash
# Full health check
./scripts/health-check.sh full

# Backend only
./scripts/health-check.sh api

# Frontend only
./scripts/health-check.sh frontend
```

### 4. Rollback Failed Deployment

```bash
# Rollback backend
./scripts/rollback.sh backend

# Rollback frontend
./scripts/rollback.sh frontend
```

## Deployment Scripts

### Main Script: `deploy.sh`

**Purpose**: Orchestrates the entire deployment process

**Usage**:
```bash
./scripts/deploy.sh [OPTIONS]
```

**Options**:
- `--dry-run`: Show what would be deployed without making changes
- `--force-backend`: Deploy backend even if no changes detected
- `--force-frontend`: Deploy frontend even if no changes detected
- `--force-all`: Deploy both components
- `--help`: Show help message

**How It Works**:
1. Checks git status (warns about uncommitted changes)
2. Detects changes:
   - Backend: `donation_tracker_api/`, `docker-compose.prod.yml`, `Dockerfile`
   - Frontend: `donation_tracker_frontend/src/`, `donation_tracker_frontend/public/`
3. Shows deployment plan
4. Prompts for confirmation (unless dry-run)
5. Deploys changed components
6. Runs health checks
7. Shows summary

**Example Output**:
```
=========================================
  DONATION TRACKER DEPLOYMENT
=========================================

[STEP] Checking git status
[INFO] ✓ Working directory clean
[INFO] Branch: main
[INFO] Commit: a1b2c3d (feat: add new feature)

[STEP] Detecting backend changes
[INFO] Backend changes detected:
  - donation_tracker_api/app/models/donor.rb

[STEP] Detecting frontend changes
[INFO] No frontend changes detected

=========================================
  DEPLOYMENT PLAN
=========================================
[INFO] ✓ Backend will be deployed
[INFO] ✗ Frontend will be skipped

Proceed with deployment? (y/N)
```

### Backend Script: `deploy-backend.sh`

**Purpose**: Deploys Rails API backend

**Usage**:
```bash
./scripts/deploy-backend.sh [--dry-run]
```

**Steps**:
1. **Prerequisites**: Check Docker, disk space
2. **Backup**: Database backup to `/var/backups/donation-tracker/`
3. **Build**: Docker image (tagged with git hash)
4. **Deploy**: Stop → Start API container
5. **Migrations**: Run `rails db:migrate` if new migrations detected
6. **Health Check**: Verify API endpoint responds
7. **Cleanup**: Remove dangling Docker images

**Backups**:
- Location: `/var/backups/donation-tracker/db_backup_YYYYMMDD_HHMMSS.sql`
- Retention: Last 5 backups kept automatically

### Frontend Script: `deploy-frontend.sh`

**Purpose**: Builds and deploys React frontend

**Usage**:
```bash
./scripts/deploy-frontend.sh [--dry-run]
```

**Steps**:
1. **Prerequisites**: Check Node.js, dependencies
2. **Tests**: Run `npm test`
3. **Linting**: Run `npm run lint`
4. **Build**: `npm run build` (production bundle)
5. **Backup**: Current frontend on server
6. **Deploy**: rsync to `/var/www/donation-tracker/`
7. **Permissions**: Set `www-data:www-data`, `755`
8. **Nginx**: Reload configuration
9. **Health Check**: Verify frontend loads

**Backups**:
- Location: `/var/backups/donation-tracker/frontend/build_YYYYMMDD_HHMMSS/`
- Retention: Last 3 backups kept automatically

### Health Check Script: `health-check.sh`

**Purpose**: Validates system health after deployment

**Usage**:
```bash
./scripts/health-check.sh [api|frontend|full]
```

**Checks**:

**API Mode**:
- Docker containers running
- Database connection (`pg_isready`)
- API endpoint responds (`/api/health`)

**Frontend Mode**:
- Frontend URL loads and returns HTML

**Full Mode** (default):
- All of the above, plus:
- Disk space < 90% used
- SSL certificate expiration (warns if < 30 days)

**Exit Codes**:
- `0`: All checks passed
- `1`: One or more checks failed

### Rollback Script: `rollback.sh`

**Purpose**: Revert to previous working state

**Usage**:
```bash
./scripts/rollback.sh <component> [--dry-run]
```

**Components**:
- `backend`: Rollback API + database
- `frontend`: Rollback static files

**Backend Rollback**:
1. Tags previous Docker image (from git hash)
2. Restarts API container
3. Runs health check
4. **Manual step**: Database rollback (if migrations ran)

**Frontend Rollback**:
1. Restores from latest backup
2. Sets permissions
3. Reloads Nginx
4. Runs health check

**Example**:
```bash
# Preview backend rollback
./scripts/rollback.sh backend --dry-run

# Perform frontend rollback
./scripts/rollback.sh frontend
```

## Testing Scenarios

### Manual Testing Checklist

Before using in production, test these scenarios in dry-run mode:

#### Scenario 1: Backend-Only Change
```bash
# 1. Make a change to backend code
echo "# test comment" >> donation_tracker_api/app/models/donor.rb
git add donation_tracker_api/app/models/donor.rb
git commit -m "test: backend change"

# 2. Test dry-run
./scripts/deploy.sh --dry-run

# Expected: Should show "Backend will be deployed", "Frontend will be skipped"
```

#### Scenario 2: Frontend-Only Change
```bash
# 1. Make a change to frontend code
echo "// test comment" >> donation_tracker_frontend/src/App.tsx
git add donation_tracker_frontend/src/App.tsx
git commit -m "test: frontend change"

# 2. Test dry-run
./scripts/deploy.sh --dry-run

# Expected: Should show "Backend will be skipped", "Frontend will be deployed"
```

#### Scenario 3: Full-Stack Change
```bash
# 1. Make changes to both
echo "# test" >> donation_tracker_api/app/models/donor.rb
echo "// test" >> donation_tracker_frontend/src/App.tsx
git add .
git commit -m "test: full-stack change"

# 2. Test dry-run
./scripts/deploy.sh --dry-run

# Expected: Should show "Backend will be deployed", "Frontend will be deployed"
```

#### Scenario 4: New Migration
```bash
# 1. Create a migration
cd donation_tracker_api
docker compose exec api bundle exec rails g migration AddTestColumn
git add db/migrate/
git commit -m "test: add migration"
cd ..

# 2. Test dry-run
./scripts/deploy.sh --dry-run

# Expected: Should show "New migrations detected", "Would run: rails db:migrate"
```

#### Scenario 5: Force Deployment (No Changes)
```bash
# No file changes, but force deployment
./scripts/deploy.sh --force-all --dry-run

# Expected: Should show both components will be deployed
```

#### Scenario 6: Disk Space Check
```bash
# Test health check
./scripts/health-check.sh full

# Expected: Should show disk usage percentage
```

#### Scenario 7: Rollback Simulation
```bash
# Test backend rollback dry-run
./scripts/rollback.sh backend --dry-run

# Expected: Should show "Would rollback to commit: <previous-hash>"
```

### Validation Checklist

After testing, verify:
- ✅ Change detection works correctly (backend/frontend)
- ✅ Dry-run mode shows correct plan without making changes
- ✅ Force flags override change detection
- ✅ Health checks validate system status
- ✅ Rollback script identifies previous state
- ✅ Git status warnings work for uncommitted changes
- ✅ Scripts have correct permissions (executable)

## Rollback Procedures

### When to Rollback

Rollback if:
- Health checks fail after deployment
- Application errors detected
- Database migration issues
- Frontend not loading

### Backend Rollback

```bash
# 1. Rollback API container
./scripts/rollback.sh backend

# 2. If migrations were run, restore database
BACKUP_FILE=$(ls -t /var/backups/donation-tracker/db_backup_*.sql | head -1)
docker compose -f docker-compose.prod.yml exec -T db psql -U donation_tracker donation_tracker_production < "$BACKUP_FILE"

# 3. Verify health
./scripts/health-check.sh api
```

### Frontend Rollback (Instant - ~1 second)

**Rollback to previous release:**
```bash
./scripts/rollback.sh frontend

# Completes in ~1 second (atomic symlink switch)
# No file copying, zero downtime
```

**Rollback to specific release:**
```bash
# List available releases (shows last 10)
ssh root@donations.projectsforasia.com "ls -t /var/www/donation-tracker/donation_tracker_frontend/releases | head -10"

# Rollback to specific release
./scripts/rollback.sh frontend --to 20260217-120000

# Example output:
# [INFO] Rolling back to: 20260217-120000
# [INFO] ✓ Symlink updated (current → releases/20260217-120000)
# [INFO] ✓ Nginx reloaded
# [INFO] ✓ Frontend rollback successful
```

**How it works:**
1. Changes symlink: `current → releases/20260217-120000`
2. Reloads Nginx
3. Runs health check
4. **Total time:** ~1-2 seconds

### Emergency Manual Rollback

If scripts fail, manual rollback:

**Backend**:
```bash
# 1. List available images
docker images | grep donation-tracker-api

# 2. Tag previous working image
docker tag donation-tracker-api:<previous-hash> donation-tracker-api:latest

# 3. Restart
docker compose -f docker-compose.prod.yml restart api
```

**Frontend (Manual Symlink Switch)**:
```bash
# 1. SSH to server
ssh root@donations.projectsforasia.com

# 2. List available releases
cd /var/www/donation-tracker/donation_tracker_frontend
ls -t releases/

# 3. Update symlink to previous release
ln -sfn releases/20260217-120000 current

# 4. Reload Nginx
nginx -t && systemctl reload nginx
```

## Troubleshooting

### Common Issues

#### "No changes detected" but I want to deploy

**Solution**: Use force flags
```bash
./scripts/deploy.sh --force-backend  # Force backend
./scripts/deploy.sh --force-all      # Force everything
```

#### Health check fails after backend deployment

**Symptoms**: "API health check FAILED"

**Debug**:
```bash
# Check API logs
docker compose -f docker-compose.prod.yml logs api --tail 50

# Check container status
docker compose -f docker-compose.prod.yml ps

# Check database connection
docker compose -f docker-compose.prod.yml exec db pg_isready -U donation_tracker
```

**Solution**: Check for errors in logs, verify database is running

#### Frontend deployment fails: "Tests failed"

**Symptoms**: "Tests failed" during frontend deployment

**Debug**:
```bash
# Run tests locally to see failures
cd donation_tracker_frontend
npm test -- --watchAll=false
```

**Solution**: Fix failing tests before deploying

#### SSH connection refused during frontend deployment

**Symptoms**: "Failed to sync files to server"

**Debug**:
```bash
# Test SSH connection
ssh root@donations.projectsforasia.com "echo Connected"

# Check SSH key
ssh-add -l
```

**Solution**: Verify SSH key is added, server is reachable

#### Insufficient disk space

**Symptoms**: "Insufficient disk space: XGB available (need at least 2GB)"

**Debug**:
```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a
```

**Solution**: Free up disk space or increase server storage

#### Migration fails during deployment

**Symptoms**: "Migrations failed"

**Debug**:
```bash
# Check migration errors
docker compose -f docker-compose.prod.yml logs api | grep -i migration

# Try running migrations manually
docker compose -f docker-compose.prod.yml exec api bundle exec rails db:migrate
```

**Solution**: Fix migration errors, rollback database if needed

### Getting Help

If issues persist:

1. **Check logs**:
   ```bash
   # Backend
   docker compose -f docker-compose.prod.yml logs api --tail 100

   # Nginx
   ssh root@donations.projectsforasia.com "tail -50 /var/log/nginx/error.log"
   ```

2. **Run health checks**:
   ```bash
   ./scripts/health-check.sh full
   ```

3. **Manual verification**:
   ```bash
   # Test API directly
   curl https://donations.projectsforasia.com/api/health

   # Test frontend
   curl https://donations.projectsforasia.com
   ```

4. **Review deployment documentation**:
   - See `deployment/DEPLOYMENT-DOCKER.md` for manual deployment steps

## Best Practices

### Before Deploying

1. ✅ **Commit all changes** (script warns about uncommitted changes)
2. ✅ **Run tests locally**:
   ```bash
   bash scripts/test-backend.sh
   cd donation_tracker_frontend && npm test
   ```
3. ✅ **Use dry-run first**:
   ```bash
   ./scripts/deploy.sh --dry-run
   ```
4. ✅ **Check health before deploying**:
   ```bash
   ./scripts/health-check.sh full
   ```

### During Deployment

1. ✅ **Monitor logs** in another terminal:
   ```bash
   # Backend
   docker compose -f docker-compose.prod.yml logs -f api

   # Frontend (on server)
   ssh root@donations.projectsforasia.com "tail -f /var/log/nginx/error.log"
   ```

2. ✅ **Watch for errors** in deployment output

3. ✅ **Wait for health checks** to complete

### After Deployment

1. ✅ **Verify health**:
   ```bash
   ./scripts/health-check.sh full
   ```

2. ✅ **Test critical paths** manually:
   - Visit https://donations.projectsforasia.com
   - Login via Google OAuth
   - Create a test donation

3. ✅ **Check SSL certificate expiration**

4. ✅ **Review disk space usage**

### Deployment Schedule

Recommended deployment windows:
- **Preferred**: Off-peak hours (low usage)
- **Avoid**: During active data entry periods
- **Frequency**: As needed (typically after each feature/fix)

### Backup Retention

Automatic cleanup keeps:
- **Database**: Last 5 backups
- **Frontend**: Last 3 backups
- **Docker images**: Tagged by git hash

Manual cleanup if needed:
```bash
# Clean old database backups
ssh root@donations.projectsforasia.com "ls -t /var/backups/donation-tracker/db_backup_* | tail -n +6 | xargs rm"

# Clean old Docker images
docker image prune -a
```

---

## Future Enhancements

Potential improvements (not yet implemented):

- [ ] Slack/email notifications on deployment success/failure
- [ ] Deployment lock file (prevent concurrent deployments)
- [ ] Database migration preview before applying
- [ ] Container resource monitoring (CPU/memory before/after)
- [ ] Integration with CI/CD pipeline (GitHub Actions)
- [ ] Blue-green deployment support
- [ ] Canary deployment for gradual rollouts

---

**Last Updated**: 2026-02-18
**TICKET**: TICKET-138
**Related Docs**: `deployment/DEPLOYMENT-DOCKER.md`, `CLAUDE.md`
