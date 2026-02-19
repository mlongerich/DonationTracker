# Migration Guide: Symlink Deployment Pattern

**One-time setup required for production server**

## Overview

The deployment scripts now use a **releases + symlink** pattern for instant, zero-downtime deployments and rollbacks.

### What Changed?

**Before (Copy + Backup):**
```
/var/www/.../build/          ← Direct deployment
/var/backups/.../build_*     ← Manual backups
```

**After (Releases + Symlink):**
```
/var/www/.../releases/20260217-120000/    ← Release 1
/var/www/.../releases/20260218-143000/    ← Release 2
/var/www/.../releases/20260218-150000/    ← Release 3 (current)
/var/www/.../current → releases/20260218-150000  ← Symlink
```

### Benefits

- ✅ **Instant rollback** (1 second vs 60 seconds)
- ✅ **Zero downtime** (atomic symlink switch)
- ✅ **No backup step** (releases ARE the backups)
- ✅ **Industry standard** (Capistrano, Deployer pattern)

---

## Migration Steps

### Step 1: Update Nginx Configuration

SSH to production server and update Nginx to serve from `current` symlink:

```bash
ssh root@donations.projectsforasia.com
```

Edit Nginx configuration:
```bash
nano /etc/nginx/sites-available/donations.projectsforasia.com
```

**Find this line:**
```nginx
root /var/www/donation-tracker/donation_tracker_frontend/build;
```

**Change to:**
```nginx
root /var/www/donation-tracker/donation_tracker_frontend/current;
```

**Test and reload:**
```bash
nginx -t
systemctl reload nginx
```

### Step 2: Create Initial Release Structure

On production server, migrate existing build to releases structure:

```bash
cd /var/www/donation-tracker/donation_tracker_frontend

# Create releases directory
mkdir -p releases

# Move current build to first release
mv build releases/20260218-initial

# Create symlink
ln -sfn releases/20260218-initial current

# Verify
ls -la
# Should show: current → releases/20260218-initial
```

### Step 3: Verify Everything Still Works

```bash
# Check Nginx serves the site
curl https://donations.projectsforasia.com

# Check in browser
# Visit https://donations.projectsforasia.com
```

### Step 4: Test New Deployment (Local)

From your local machine:

```bash
# Test dry-run first
./scripts/deploy.sh --dry-run

# Should show:
# - Change detection using git tags
# - Would deploy to releases/TIMESTAMP
# - Would update symlink

# Real deployment
./scripts/deploy.sh
```

### Step 5: Test Instant Rollback

```bash
# Rollback to previous release
./scripts/rollback.sh frontend

# Should complete in ~1 second (instant!)
```

---

## Verification Checklist

After migration, verify:

- [ ] Nginx config updated (`root .../current;`)
- [ ] Current symlink exists and points to a release
- [ ] Website loads correctly
- [ ] New deployments create timestamped releases
- [ ] Symlink updates atomically
- [ ] Rollback is instant (<2 seconds)
- [ ] Old releases cleanup works (keeps last 5)

---

## Rollback Plan

If something goes wrong during migration:

```bash
# On production server
cd /var/www/donation-tracker/donation_tracker_frontend

# Remove symlink
rm current

# Restore old structure
mv releases/20260218-initial build

# Update Nginx back to old config
nano /etc/nginx/sites-available/donations.projectsforasia.com
# Change: root .../current; → root .../build;

nginx -t && systemctl reload nginx
```

---

## Git Deployment Tags

The deployment script now tracks deployments using git tags:

**How it works:**
- After successful deployment, creates tag: `deployed-YYYYMMDD-HHMMSS`
- Change detection compares against last deployment tag (not `HEAD~1`)
- Accurate even with multiple commits between deployments

**View deployment history:**
```bash
git tag -l 'deployed-*' --sort=-version:refname

# Example output:
# deployed-20260218-150000
# deployed-20260217-120000
# deployed-20260215-093000
```

**Benefits:**
- Accurate change detection across multiple commits
- Clear deployment history
- Can reference specific deployments

---

## FAQ

**Q: What if I have uncommitted changes when deploying?**
A: Script warns you but allows proceeding. Git tags still work.

**Q: Do I need to manually create tags?**
A: No, deployment script creates them automatically after successful deploy.

**Q: How many releases are kept?**
A: Last 5 releases. Older ones are auto-deleted.

**Q: What if I want to rollback to a specific release (not just previous)?**
A: Use: `./scripts/rollback.sh frontend --to 20260217-120000`

**Q: How much extra disk space does this use?**
A: ~5MB (React builds are ~1MB each, 5 releases = 5MB vs 3 backups = 3MB). Negligible.

**Q: Can I see which release is currently deployed?**
A: Yes: `ssh root@donations.projectsforasia.com "readlink /var/www/donation-tracker/donation_tracker_frontend/current"`

---

## Troubleshooting

### Issue: "current" symlink doesn't exist after deployment

**Solution:**
```bash
ssh root@donations.projectsforasia.com
cd /var/www/donation-tracker/donation_tracker_frontend
ln -sfn releases/$(ls -t releases | head -1) current
```

### Issue: Nginx serves wrong files

**Solution:** Verify Nginx config points to `current`:
```bash
grep "root" /etc/nginx/sites-available/donations.projectsforasia.com
# Should show: root .../current;
```

### Issue: Old /build directory still exists

**Solution:** It's safe to remove after migration:
```bash
ssh root@donations.projectsforasia.com
cd /var/www/donation-tracker/donation_tracker_frontend
rm -rf build  # Only do this AFTER verifying current symlink works
```

---

**Last Updated:** 2026-02-18
**Related:** TICKET-138, deployment/AUTOMATED-DEPLOYMENT.md
