#!/bin/bash
# Rollback script for reverting failed deployments
# Usage: ./scripts/rollback.sh [backend|frontend] [--dry-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
COMPONENT="${1:-}"
ROLLBACK_TO_TAG=""
BACKUP_DIR="/var/backups/donation-tracker"
COMPOSE_FILE="docker-compose.prod.yml"
PROD_SERVER="${DEPLOY_SERVER:-donations.projectsforasia.com}"
PROD_USER="${DEPLOY_USER:-root}"

# Parse arguments
shift 2>/dev/null || true  # Remove component from args
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --to)
      ROLLBACK_TO_TAG="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

rollback_backend() {
  log_step "Rolling back backend deployment"

  # Get previous git commit
  local previous_commit=$(git rev-parse --short HEAD~1)

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would rollback to commit: $previous_commit"
    log_info "[DRY RUN] Would tag and restart API container"
    log_info "[DRY RUN] Would rollback database migration (manual step required)"
    return 0
  fi

  # Check if previous image exists
  if docker images | grep -q "donation-tracker-api.*${previous_commit}"; then
    log_info "Found previous image: donation-tracker-api:${previous_commit}"

    # Tag previous image as latest
    docker tag donation-tracker-api:"${previous_commit}" donation-tracker-api:latest
    log_info "✓ Tagged previous image as latest"

    # Restart API container
    docker compose -f "$COMPOSE_FILE" stop api
    docker compose -f "$COMPOSE_FILE" up -d api
    log_info "✓ API container restarted with previous image"

    # Wait for container to be ready
    sleep 5

    # Check health
    if bash scripts/health-check.sh api; then
      log_info "✓ Backend rollback successful"
    else
      log_error "Backend health check failed after rollback"
      return 1
    fi
  else
    log_error "Previous image not found: donation-tracker-api:${previous_commit}"
    log_error "Manual rollback required:"
    log_error "  1. Find previous working image: docker images | grep donation-tracker-api"
    log_error "  2. Tag it: docker tag donation-tracker-api:<hash> donation-tracker-api:latest"
    log_error "  3. Restart: docker compose -f $COMPOSE_FILE restart api"
    return 1
  fi

  # Database rollback (manual step)
  log_warn "⚠ If migrations were run, you need to rollback the database:"
  log_warn "  1. Find latest backup: ls -t ${BACKUP_DIR}/db_backup_*.sql | head -1"
  log_warn "  2. Restore: docker compose -f $COMPOSE_FILE exec -T db psql -U donation_tracker donation_tracker_production < backup.sql"
}

rollback_frontend() {
  log_step "Rolling back frontend deployment"

  local prod_base_path="/var/www/donation-tracker/donation_tracker_frontend"
  local prod_current_link="${prod_base_path}/current"

  # Get list of available releases
  local releases=$(ssh "${PROD_USER}@${PROD_SERVER}" "ls -t ${prod_base_path}/releases 2>/dev/null" || echo "")

  if [ -z "$releases" ]; then
    log_error "No releases found on server"
    log_error "Manual rollback required"
    return 1
  fi

  # Determine target release
  local target_release=""

  if [ -n "$ROLLBACK_TO_TAG" ]; then
    # Rollback to specific release
    if echo "$releases" | grep -q "^${ROLLBACK_TO_TAG}$"; then
      target_release="$ROLLBACK_TO_TAG"
      log_info "Rolling back to specified release: $target_release"
    else
      log_error "Release not found: $ROLLBACK_TO_TAG"
      log_info "Available releases:"
      echo "$releases" | head -10 | sed 's/^/  - /'
      return 1
    fi
  else
    # Get current release
    local current_release=$(ssh "${PROD_USER}@${PROD_SERVER}" "readlink ${prod_current_link} 2>/dev/null | xargs basename" || echo "")

    # Get previous release (second in list after current)
    target_release=$(echo "$releases" | grep -v "^${current_release}$" | head -1)

    if [ -z "$target_release" ]; then
      log_error "No previous release found"
      log_info "Available releases:"
      echo "$releases" | sed 's/^/  - /'
      return 1
    fi

    log_info "Current release: ${current_release:-unknown}"
    log_info "Rolling back to: $target_release"
  fi

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would update symlink: current → releases/${target_release}"
    log_info "[DRY RUN] Would reload Nginx"
    return 0
  fi

  # Atomic symlink switch
  if ssh "${PROD_USER}@${PROD_SERVER}" "ln -sfn releases/${target_release} ${prod_current_link}"; then
    log_info "✓ Symlink updated (current → releases/${target_release})"
  else
    log_error "Failed to update symlink"
    return 1
  fi

  # Reload Nginx
  if ssh "${PROD_USER}@${PROD_SERVER}" "nginx -t && systemctl reload nginx" 2>/dev/null; then
    log_info "✓ Nginx reloaded"
  else
    log_error "Failed to reload Nginx"
    return 1
  fi

  # Check health
  sleep 2
  if bash scripts/health-check.sh frontend; then
    log_info "✓ Frontend rollback successful"
  else
    log_error "Frontend health check failed after rollback"
    return 1
  fi
}

show_usage() {
  echo "Usage: $0 <component> [OPTIONS]"
  echo ""
  echo "Components:"
  echo "  backend     Rollback backend (API + database)"
  echo "  frontend    Rollback frontend (static files)"
  echo ""
  echo "Options:"
  echo "  --dry-run          Show what would be rolled back without making changes"
  echo "  --to <release>     Rollback to specific release (frontend only)"
  echo ""
  echo "Examples:"
  echo "  $0 backend                    # Rollback backend to previous state"
  echo "  $0 frontend                   # Rollback frontend to previous release"
  echo "  $0 frontend --dry-run         # Preview frontend rollback"
  echo "  $0 frontend --to 20260217-120000  # Rollback to specific release"
}

# Main execution
main() {
  if [ -z "$COMPONENT" ]; then
    log_error "Component not specified"
    echo ""
    show_usage
    exit 1
  fi

  echo "========================================="
  echo "  ROLLBACK: $COMPONENT"
  if [ "$DRY_RUN" = true ]; then
    echo "  MODE: DRY RUN"
  fi
  echo "========================================="
  echo ""

  log_warn "⚠ WARNING: This will revert the $COMPONENT to its previous state"
  echo ""

  if [ "$DRY_RUN" = false ]; then
    read -p "Are you sure you want to rollback? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Rollback cancelled"
      exit 0
    fi
    echo ""
  fi

  case "$COMPONENT" in
    backend)
      if rollback_backend; then
        log_info "✓ Backend rollback completed"
      else
        log_error "✗ Backend rollback failed"
        exit 1
      fi
      ;;
    frontend)
      if rollback_frontend; then
        log_info "✓ Frontend rollback completed"
      else
        log_error "✗ Frontend rollback failed"
        exit 1
      fi
      ;;
    *)
      log_error "Invalid component: $COMPONENT"
      echo ""
      show_usage
      exit 1
      ;;
  esac

  echo ""
  echo "========================================="
  log_info "Rollback completed ✓"
  if [ "$DRY_RUN" = true ]; then
    log_info "This was a DRY RUN - no changes were made"
  fi
  echo "========================================="
}

main "$@"
