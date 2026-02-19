#!/bin/bash
# Frontend deployment script
# Usage: ./scripts/deploy-frontend.sh [--dry-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
FRONTEND_DIR="donation_tracker_frontend"
BUILD_DIR="${FRONTEND_DIR}/build"
PROD_SERVER="${DEPLOY_SERVER:-donations.projectsforasia.com}"
PROD_USER="${DEPLOY_USER:-root}"
PROD_BASE_PATH="/var/www/donation-tracker/donation_tracker_frontend"
RELEASE_NAME="$(date +%Y%m%d-%H%M%S)"
PROD_RELEASE_PATH="${PROD_BASE_PATH}/releases/${RELEASE_NAME}"
PROD_CURRENT_LINK="${PROD_BASE_PATH}/current"

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

  # Check if frontend directory exists
  if [ ! -d "$FRONTEND_DIR" ]; then
    log_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
  fi

  # Check if node_modules exists
  if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    log_error "node_modules not found. Run: cd $FRONTEND_DIR && npm install"
    exit 1
  fi

  # Check Node version
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi

  local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$node_version" -lt 18 ]; then
    log_error "Node.js version must be 18 or higher (current: $(node -v))"
    exit 1
  fi

  log_info "Prerequisites OK (Node $(node -v))"
}

run_tests() {
  log_step "Running frontend tests"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would run: npm test"
    return 0
  fi

  cd "$FRONTEND_DIR"

  if CI=true npm test -- --watchAll=false --passWithNoTests; then
    log_info "✓ Tests passed"
  else
    log_error "Tests failed"
    exit 1
  fi

  cd ..
}

run_linting() {
  log_step "Running ESLint"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would run: npm run lint"
    return 0
  fi

  cd "$FRONTEND_DIR"

  if npm run lint; then
    log_info "✓ Linting passed"
  else
    log_error "Linting failed"
    exit 1
  fi

  cd ..
}

build_frontend() {
  log_step "Building production bundle"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would run: npm run build"
    return 0
  fi

  cd "$FRONTEND_DIR"

  # Clean previous build
  if [ -d "build" ]; then
    rm -rf build
    log_info "Cleaned previous build"
  fi

  # Build
  if npm run build; then
    log_info "✓ Production bundle built successfully"

    # Show build size
    local build_size=$(du -sh build | cut -f1)
    log_info "Build size: $build_size"
  else
    log_error "Build failed"
    exit 1
  fi

  cd ..
}

deploy_to_server() {
  log_step "Deploying to production server (release: ${RELEASE_NAME})"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would create release directory: ${PROD_RELEASE_PATH}"
    log_info "[DRY RUN] Would rsync build to: ${PROD_USER}@${PROD_SERVER}:${PROD_RELEASE_PATH}"
    return 0
  fi

  # Create releases directory structure if it doesn't exist
  ssh "${PROD_USER}@${PROD_SERVER}" "mkdir -p ${PROD_BASE_PATH}/releases"

  # Create this release directory
  ssh "${PROD_USER}@${PROD_SERVER}" "mkdir -p ${PROD_RELEASE_PATH}"

  # Use rsync for efficient transfer
  if rsync -avz --delete "${BUILD_DIR}/" "${PROD_USER}@${PROD_SERVER}:${PROD_RELEASE_PATH}/"; then
    log_info "✓ Files synced to release: ${RELEASE_NAME}"
  else
    log_error "Failed to sync files to server"
    exit 1
  fi
}

update_symlink() {
  log_step "Updating symlink to new release"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would update symlink: ${PROD_CURRENT_LINK} → releases/${RELEASE_NAME}"
    return 0
  fi

  # Atomic symlink update (ln -sfn)
  if ssh "${PROD_USER}@${PROD_SERVER}" "ln -sfn releases/${RELEASE_NAME} ${PROD_CURRENT_LINK}"; then
    log_info "✓ Symlink updated (current → releases/${RELEASE_NAME})"
  else
    log_error "Failed to update symlink"
    exit 1
  fi
}

cleanup_old_releases() {
  log_step "Cleaning up old releases"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would keep last 5 releases, delete older ones"
    return 0
  fi

  # Keep last 5 releases, delete the rest
  local cleanup_cmd="cd ${PROD_BASE_PATH}/releases && ls -t | tail -n +6 | xargs -r rm -rf"

  if ssh "${PROD_USER}@${PROD_SERVER}" "$cleanup_cmd" 2>/dev/null; then
    local remaining=$(ssh "${PROD_USER}@${PROD_SERVER}" "ls ${PROD_BASE_PATH}/releases | wc -l" 2>/dev/null | tr -d ' ')
    log_info "✓ Cleaned up old releases (${remaining} releases kept)"
  else
    log_warn "Could not cleanup old releases (non-critical)"
  fi
}

set_permissions() {
  log_step "Setting file permissions"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would set ownership to www-data:www-data"
    log_info "[DRY RUN] Would set permissions to 755"
    return 0
  fi

  # Set ownership and permissions on the release
  if ssh "${PROD_USER}@${PROD_SERVER}" "chown -R www-data:www-data ${PROD_RELEASE_PATH} && chmod -R 755 ${PROD_RELEASE_PATH}"; then
    log_info "✓ Permissions set"
  else
    log_warn "Could not set permissions (might need sudo)"
  fi
}

reload_nginx() {
  log_step "Reloading Nginx"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would reload Nginx"
    return 0
  fi

  # Test nginx configuration first
  if ssh "${PROD_USER}@${PROD_SERVER}" "nginx -t" 2>/dev/null; then
    log_info "✓ Nginx configuration is valid"

    # Reload nginx
    if ssh "${PROD_USER}@${PROD_SERVER}" "systemctl reload nginx" 2>/dev/null; then
      log_info "✓ Nginx reloaded"
    else
      log_error "Failed to reload Nginx"
      exit 1
    fi
  else
    log_error "Nginx configuration test failed"
    exit 1
  fi
}

# Main deployment flow
main() {
  echo "========================================="
  echo "  Frontend Deployment"
  if [ "$DRY_RUN" = true ]; then
    echo "  MODE: DRY RUN"
  fi
  echo "  Target: ${PROD_USER}@${PROD_SERVER}"
  echo "========================================="
  echo ""

  local start_time=$(date +%s)

  # Pre-deployment checks
  check_prerequisites
  run_tests
  run_linting

  # Build
  build_frontend

  # Deploy to server (releases + symlink pattern)
  deploy_to_server
  set_permissions
  update_symlink
  cleanup_old_releases
  reload_nginx

  # Health check
  if [ "$DRY_RUN" = false ]; then
    log_step "Running health check"
    sleep 2  # Give nginx time to reload
    if bash scripts/health-check.sh frontend; then
      log_info "✓ Health check passed"
    else
      log_error "Health check failed - consider rollback"
      exit 1
    fi
  else
    log_info "[DRY RUN] Would run health check"
  fi

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  echo ""
  echo "========================================="
  log_info "Frontend deployment completed in ${duration}s ✓"
  if [ "$DRY_RUN" = true ]; then
    log_info "This was a DRY RUN - no changes were made"
  fi
  echo "========================================="
}

main "$@"
