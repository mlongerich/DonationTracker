#!/bin/bash
# Backend deployment script
# Usage: ./scripts/deploy-backend.sh [--dry-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
BACKUP_DIR="/var/backups/donation-tracker"
COMPOSE_FILE="docker-compose.prod.yml"
GIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
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

check_prerequisites() {
  log_step "Checking prerequisites"

  # Check if docker compose is available
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
  fi

  # Check if compose file exists
  if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
  fi

  # Check disk space (need at least 2GB free for image builds)
  local available_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
  if [ "$available_space" -lt 2 ]; then
    log_error "Insufficient disk space: ${available_space}GB available (need at least 2GB)"
    exit 1
  fi

  log_info "Prerequisites OK (${available_space}GB available)"
}

backup_database() {
  log_step "Creating database backup"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would backup database to: ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    return 0
  fi

  # Create backup directory if it doesn't exist
  mkdir -p "$BACKUP_DIR"

  # Backup database
  local backup_file="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

  if docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U donation_tracker donation_tracker_production > "$backup_file" 2>/dev/null; then
    log_info "✓ Database backed up to: $backup_file"

    # Keep only last 5 backups
    ls -t ${BACKUP_DIR}/db_backup_*.sql | tail -n +6 | xargs -r rm
    log_info "Cleaned up old backups (keeping last 5)"
  else
    log_error "Failed to backup database"
    exit 1
  fi
}

check_migrations() {
  log_step "Checking for pending migrations"

  local migrations_exist=false

  # Check if there are new migration files
  if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -q "donation_tracker_api/db/migrate/"; then
    migrations_exist=true
    log_info "New migrations detected"
  else
    log_info "No new migrations"
  fi

  echo "$migrations_exist"
}

build_api_container() {
  log_step "Building API container"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would build API container with tag: api:${GIT_HASH}"
    return 0
  fi

  if docker compose -f "$COMPOSE_FILE" build api; then
    log_info "✓ API container built successfully"

    # Tag the image with git hash for versioning
    docker tag donation-tracker-api:latest donation-tracker-api:"${GIT_HASH}"
    log_info "✓ Tagged image: donation-tracker-api:${GIT_HASH}"
  else
    log_error "Failed to build API container"
    exit 1
  fi
}

stop_api_container() {
  log_step "Stopping API container"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would stop API container"
    return 0
  fi

  if docker compose -f "$COMPOSE_FILE" stop api; then
    log_info "✓ API container stopped"
  else
    log_warn "Failed to stop API container gracefully"
  fi
}

start_api_container() {
  log_step "Starting API container"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would start API container"
    return 0
  fi

  if docker compose -f "$COMPOSE_FILE" up -d api; then
    log_info "✓ API container started"

    # Wait for container to be ready
    sleep 5
  else
    log_error "Failed to start API container"
    exit 1
  fi
}

run_migrations() {
  local has_migrations=$1

  if [ "$has_migrations" = "false" ]; then
    log_info "Skipping migrations (none detected)"
    return 0
  fi

  log_step "Running database migrations"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would run: rails db:migrate"
    return 0
  fi

  if docker compose -f "$COMPOSE_FILE" exec -T api bundle exec rails db:migrate; then
    log_info "✓ Migrations completed successfully"
  else
    log_error "Migrations failed"
    exit 1
  fi
}

check_api_logs() {
  log_step "Checking API logs for errors"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would check API logs"
    return 0
  fi

  # Get last 20 lines of logs
  local recent_logs=$(docker compose -f "$COMPOSE_FILE" logs api --tail 20 2>&1)

  # Check for critical errors
  if echo "$recent_logs" | grep -qi "error\|exception\|failed"; then
    log_warn "⚠ Found errors in recent logs:"
    echo "$recent_logs" | grep -i "error\|exception\|failed" | tail -5
    log_warn "Check full logs: docker compose -f $COMPOSE_FILE logs api"
  else
    log_info "✓ No critical errors in recent logs"
  fi
}

cleanup_docker_resources() {
  log_step "Cleaning up unused Docker resources"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would prune unused Docker images"
    return 0
  fi

  # Remove dangling images (untagged)
  if docker image prune -f > /dev/null 2>&1; then
    log_info "✓ Cleaned up dangling images"
  fi
}

# Main deployment flow
main() {
  echo "========================================="
  echo "  Backend Deployment"
  if [ "$DRY_RUN" = true ]; then
    echo "  MODE: DRY RUN"
  fi
  echo "  Git Hash: $GIT_HASH"
  echo "========================================="
  echo ""

  local start_time=$(date +%s)

  # Pre-deployment checks
  check_prerequisites

  # Backup database
  backup_database

  # Check for migrations
  local has_migrations=$(check_migrations)

  # Build new container
  build_api_container

  # Deploy
  stop_api_container
  start_api_container

  # Run migrations if needed
  run_migrations "$has_migrations"

  # Post-deployment checks
  check_api_logs

  # Health check
  if [ "$DRY_RUN" = false ]; then
    log_step "Running health check"
    if bash scripts/health-check.sh api; then
      log_info "✓ Health check passed"
    else
      log_error "Health check failed - consider rollback"
      exit 1
    fi
  else
    log_info "[DRY RUN] Would run health check"
  fi

  # Cleanup
  cleanup_docker_resources

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  echo ""
  echo "========================================="
  log_info "Backend deployment completed in ${duration}s ✓"
  if [ "$DRY_RUN" = true ]; then
    log_info "This was a DRY RUN - no changes were made"
  fi
  echo "========================================="
}

main "$@"
