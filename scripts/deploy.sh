#!/bin/bash
# Main deployment orchestration script
# Detects changes and deploys only what's necessary
# Usage: ./scripts/deploy.sh [--dry-run] [--force-backend] [--force-frontend] [--force-all]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
FORCE_BACKEND=false
FORCE_FRONTEND=false
FORCE_ALL=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force-backend)
      FORCE_BACKEND=true
      shift
      ;;
    --force-frontend)
      FORCE_FRONTEND=true
      shift
      ;;
    --force-all)
      FORCE_ALL=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dry-run           Show what would be deployed without making changes"
      echo "  --force-backend     Deploy backend even if no changes detected"
      echo "  --force-frontend    Deploy frontend even if no changes detected"
      echo "  --force-all         Deploy both backend and frontend"
      echo "  --help              Show this help message"
      exit 0
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

log_header() {
  echo -e "${MAGENTA}=========================================${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo -e "${MAGENTA}=========================================${NC}"
}

get_last_deployment_tag() {
  # Get the most recent deployment tag
  local last_tag=$(git tag -l 'deployed-*' --sort=-version:refname 2>/dev/null | head -1)
  echo "$last_tag"
}

detect_backend_changes() {
  log_step "Detecting backend changes"

  if [ "$FORCE_BACKEND" = true ] || [ "$FORCE_ALL" = true ]; then
    log_info "Backend deployment FORCED"
    echo "true"
    return
  fi

  # Get last deployment tag or use HEAD~1 as fallback
  local last_deployment=$(get_last_deployment_tag)
  local compare_ref="HEAD~1"

  if [ -n "$last_deployment" ]; then
    compare_ref="$last_deployment"
    log_info "Comparing against last deployment: $last_deployment"
  else
    log_info "No deployment tags found, comparing against previous commit"
  fi

  # Check if backend files changed since last deployment
  local backend_changes=$(git diff --name-only "$compare_ref" HEAD 2>/dev/null | grep -E '^donation_tracker_api/|^docker-compose.prod.yml|Dockerfile' || true)

  if [ -n "$backend_changes" ]; then
    log_info "Backend changes detected:"
    echo "$backend_changes" | sed 's/^/  - /'
    echo "true"
  else
    log_info "No backend changes detected"
    echo "false"
  fi
}

detect_frontend_changes() {
  log_step "Detecting frontend changes"

  if [ "$FORCE_FRONTEND" = true ] || [ "$FORCE_ALL" = true ]; then
    log_info "Frontend deployment FORCED"
    echo "true"
    return
  fi

  # Get last deployment tag or use HEAD~1 as fallback
  local last_deployment=$(get_last_deployment_tag)
  local compare_ref="HEAD~1"

  if [ -n "$last_deployment" ]; then
    compare_ref="$last_deployment"
    log_info "Comparing against last deployment: $last_deployment"
  else
    log_info "No deployment tags found, comparing against previous commit"
  fi

  # Check if frontend source files changed since last deployment
  local frontend_changes=$(git diff --name-only "$compare_ref" HEAD 2>/dev/null | grep -E '^donation_tracker_frontend/(src|public)/' || true)

  if [ -n "$frontend_changes" ]; then
    log_info "Frontend changes detected:"
    echo "$frontend_changes" | sed 's/^/  - /'
    echo "true"
  else
    log_info "No frontend changes detected"
    echo "false"
  fi
}

check_git_status() {
  log_step "Checking git status"

  # Check if we're in a git repository
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
  fi

  # Check if there are uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    log_warn "⚠ You have uncommitted changes"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  else
    log_info "✓ Working directory clean"
  fi

  # Show current branch and commit
  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  local current_commit=$(git rev-parse --short HEAD)
  log_info "Branch: $current_branch"
  log_info "Commit: $current_commit ($(git log -1 --pretty=%B | head -n1))"
}

deploy_backend() {
  log_header "DEPLOYING BACKEND"

  local deploy_args=""
  if [ "$DRY_RUN" = true ]; then
    deploy_args="--dry-run"
  fi

  if bash "${SCRIPT_DIR}/deploy-backend.sh" $deploy_args; then
    log_info "✓ Backend deployment successful"
    return 0
  else
    log_error "✗ Backend deployment failed"
    return 1
  fi
}

deploy_frontend() {
  log_header "DEPLOYING FRONTEND"

  local deploy_args=""
  if [ "$DRY_RUN" = true ]; then
    deploy_args="--dry-run"
  fi

  if bash "${SCRIPT_DIR}/deploy-frontend.sh" $deploy_args; then
    log_info "✓ Frontend deployment successful"
    return 0
  else
    log_error "✗ Frontend deployment failed"
    return 1
  fi
}

send_notification() {
  local status=$1
  local components=$2
  local duration=$3

  # For now, just log to stdout
  # Future: Add Slack/email notifications
  if [ "$status" = "success" ]; then
    log_info "Deployment notification: SUCCESS - Deployed $components in ${duration}s"
  else
    log_error "Deployment notification: FAILED - $components deployment failed"
  fi
}

create_deployment_tag() {
  local components=$1

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would create deployment tag: deployed-$(date +%Y%m%d-%H%M%S)"
    return 0
  fi

  local tag_name="deployed-$(date +%Y%m%d-%H%M%S)"
  local tag_message="Deployed $components to production"

  # Create annotated tag
  if git tag -a "$tag_name" -m "$tag_message" 2>/dev/null; then
    log_info "✓ Created deployment tag: $tag_name"

    # Optional: Push tag to remote (commented out - manual push recommended)
    # git push origin "$tag_name" 2>/dev/null || log_warn "Could not push tag to remote"
  else
    log_warn "Could not create deployment tag"
  fi
}

# Main deployment flow
main() {
  local start_time=$(date +%s)
  local deployment_status="success"
  local deployed_components=""

  log_header "DONATION TRACKER DEPLOYMENT"
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be made"
  fi
  echo ""

  # Pre-deployment checks
  check_git_status
  echo ""

  # Detect what needs to be deployed
  local deploy_backend=$(detect_backend_changes)
  local deploy_frontend=$(detect_frontend_changes)
  echo ""

  # Check if anything needs deployment
  if [ "$deploy_backend" = "false" ] && [ "$deploy_frontend" = "false" ]; then
    log_warn "No changes detected. Nothing to deploy."
    log_info "Use --force-backend or --force-frontend to force deployment"
    exit 0
  fi

  # Show deployment plan
  log_header "DEPLOYMENT PLAN"
  if [ "$deploy_backend" = "true" ]; then
    log_info "✓ Backend will be deployed"
    deployed_components="backend"
  else
    log_info "✗ Backend will be skipped"
  fi

  if [ "$deploy_frontend" = "true" ]; then
    log_info "✓ Frontend will be deployed"
    if [ -n "$deployed_components" ]; then
      deployed_components="${deployed_components} + frontend"
    else
      deployed_components="frontend"
    fi
  else
    log_info "✗ Frontend will be skipped"
  fi
  echo ""

  # Confirm deployment (unless dry-run)
  if [ "$DRY_RUN" = false ]; then
    read -p "Proceed with deployment? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
    echo ""
  fi

  # Deploy backend
  if [ "$deploy_backend" = "true" ]; then
    if ! deploy_backend; then
      deployment_status="failed"
      send_notification "failed" "backend" 0
      exit 1
    fi
    echo ""
  fi

  # Deploy frontend
  if [ "$deploy_frontend" = "true" ]; then
    if ! deploy_frontend; then
      deployment_status="failed"
      send_notification "failed" "frontend" 0
      exit 1
    fi
    echo ""
  fi

  # Final health check
  if [ "$DRY_RUN" = false ]; then
    log_header "FINAL HEALTH CHECK"
    if bash "${SCRIPT_DIR}/health-check.sh" full; then
      log_info "✓ All systems operational"
    else
      log_warn "⚠ Some health checks failed - review logs above"
    fi
    echo ""
  fi

  # Tag successful deployment
  if [ "$deployment_status" = "success" ]; then
    create_deployment_tag "$deployed_components"
    echo ""
  fi

  # Summary
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  log_header "DEPLOYMENT SUMMARY"
  log_info "Status: ${deployment_status}"
  log_info "Components: ${deployed_components}"
  log_info "Duration: ${duration}s"
  if [ "$DRY_RUN" = true ]; then
    log_warn "This was a DRY RUN - no actual changes were made"
  fi
  echo ""

  send_notification "$deployment_status" "$deployed_components" "$duration"

  if [ "$deployment_status" = "success" ]; then
    log_info "🎉 Deployment completed successfully!"
  else
    log_error "❌ Deployment failed"
    exit 1
  fi
}

main "$@"
