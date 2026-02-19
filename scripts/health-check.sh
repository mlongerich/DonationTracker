#!/bin/bash
# Health check script for deployment validation
# Usage: ./scripts/health-check.sh [api|frontend|full]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://donations.projectsforasia.com/api/health}"
FRONTEND_URL="${FRONTEND_URL:-https://donations.projectsforasia.com}"
TIMEOUT=10
MAX_RETRIES=3
RETRY_DELAY=5

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

check_api_health() {
  local retry_count=0

  log_info "Checking API health at $BACKEND_URL"

  while [ $retry_count -lt $MAX_RETRIES ]; do
    if curl -f -s --max-time $TIMEOUT "$BACKEND_URL" > /dev/null 2>&1; then
      log_info "✓ API health check PASSED"
      return 0
    fi

    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $MAX_RETRIES ]; then
      log_warn "API health check failed (attempt $retry_count/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done

  log_error "✗ API health check FAILED after $MAX_RETRIES attempts"
  return 1
}

check_frontend_health() {
  local retry_count=0

  log_info "Checking frontend health at $FRONTEND_URL"

  while [ $retry_count -lt $MAX_RETRIES ]; do
    if curl -f -s --max-time $TIMEOUT "$FRONTEND_URL" | grep -q "<!doctype html>" 2>/dev/null; then
      log_info "✓ Frontend health check PASSED"
      return 0
    fi

    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $MAX_RETRIES ]; then
      log_warn "Frontend health check failed (attempt $retry_count/$MAX_RETRIES). Retrying in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done

  log_error "✗ Frontend health check FAILED after $MAX_RETRIES attempts"
  return 1
}

check_docker_containers() {
  log_info "Checking Docker container status"

  # Check if docker-compose is running
  if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log_error "✗ No Docker containers running"
    return 1
  fi

  # Check API container
  if docker compose -f docker-compose.prod.yml ps api | grep -q "Up"; then
    log_info "✓ API container is running"
  else
    log_error "✗ API container is not running"
    return 1
  fi

  # Check database container
  if docker compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    log_info "✓ Database container is running"
  else
    log_error "✗ Database container is not running"
    return 1
  fi

  return 0
}

check_database_connection() {
  log_info "Checking database connection"

  if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U donation_tracker > /dev/null 2>&1; then
    log_info "✓ Database connection OK"
    return 0
  else
    log_error "✗ Database connection FAILED"
    return 1
  fi
}

check_disk_space() {
  log_info "Checking disk space"

  local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ "$disk_usage" -lt 80 ]; then
    log_info "✓ Disk space OK (${disk_usage}% used)"
    return 0
  elif [ "$disk_usage" -lt 90 ]; then
    log_warn "⚠ Disk space WARNING (${disk_usage}% used)"
    return 0
  else
    log_error "✗ Disk space CRITICAL (${disk_usage}% used)"
    return 1
  fi
}

check_ssl_certificate() {
  log_info "Checking SSL certificate expiration"

  # Extract expiry date (requires openssl)
  local expiry_date=$(echo | openssl s_client -servername donations.projectsforasia.com -connect donations.projectsforasia.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)

  if [ -z "$expiry_date" ]; then
    log_warn "⚠ Could not check SSL certificate (openssl may not be available)"
    return 0
  fi

  local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null)
  local current_epoch=$(date +%s)
  local days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))

  if [ "$days_remaining" -gt 30 ]; then
    log_info "✓ SSL certificate valid ($days_remaining days remaining)"
    return 0
  elif [ "$days_remaining" -gt 7 ]; then
    log_warn "⚠ SSL certificate expires in $days_remaining days"
    return 0
  else
    log_error "✗ SSL certificate expires in $days_remaining days - RENEW SOON"
    return 1
  fi
}

# Main execution
main() {
  local check_type="${1:-full}"
  local exit_code=0

  echo "========================================="
  echo "  Health Check: $check_type"
  echo "========================================="
  echo ""

  case "$check_type" in
    api)
      check_docker_containers || exit_code=1
      check_database_connection || exit_code=1
      check_api_health || exit_code=1
      ;;
    frontend)
      check_frontend_health || exit_code=1
      ;;
    full)
      check_disk_space || exit_code=1
      check_docker_containers || exit_code=1
      check_database_connection || exit_code=1
      check_api_health || exit_code=1
      check_frontend_health || exit_code=1
      check_ssl_certificate || exit_code=1
      ;;
    *)
      log_error "Invalid check type: $check_type"
      echo "Usage: $0 [api|frontend|full]"
      exit 1
      ;;
  esac

  echo ""
  echo "========================================="
  if [ $exit_code -eq 0 ]; then
    log_info "All health checks PASSED ✓"
  else
    log_error "Some health checks FAILED ✗"
  fi
  echo "========================================="

  exit $exit_code
}

main "$@"
