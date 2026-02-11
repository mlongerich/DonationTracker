#!/bin/bash
# Deployment script for Donation Tracker
# Handles both initial setup and ongoing deployments
#
# Usage:
#   ./deployment/scripts/deploy.sh [--initial]
#
# Flags:
#   --initial    First-time deployment (sets up services, nginx, etc.)
#   (no flags)   Ongoing deployment (pull, build, migrate, restart)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/donation-tracker"
API_DIR="$APP_DIR/donation_tracker_api"
FRONTEND_DIR="$APP_DIR/donation_tracker_frontend"
DEPLOY_USER="deploy"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_user() {
    if [ "$USER" != "$DEPLOY_USER" ] && [ "$USER" != "root" ]; then
        log_error "This script must be run as $DEPLOY_USER or root"
        exit 1
    fi
}

check_directory() {
    if [ ! -d "$APP_DIR" ]; then
        log_error "Application directory not found: $APP_DIR"
        log_info "Please clone the repository to $APP_DIR first"
        exit 1
    fi
}

initial_setup() {
    log_info "Starting initial deployment setup..."

    # Check if running as root (needed for systemd setup)
    if [ "$USER" != "root" ]; then
        log_error "Initial setup must be run as root (use sudo)"
        exit 1
    fi

    # Create log directories
    log_info "Creating log directories..."
    mkdir -p /var/log/puma
    chown -R $DEPLOY_USER:$DEPLOY_USER /var/log/puma

    # Install Nginx configuration
    log_info "Installing Nginx configuration..."
    cp "$APP_DIR/deployment/nginx/donation-tracker.conf" /etc/nginx/sites-available/donation-tracker
    ln -sf /etc/nginx/sites-available/donation-tracker /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx

    # Install Puma systemd service
    log_info "Installing Puma systemd service..."
    cp "$APP_DIR/deployment/systemd/puma.service" /etc/systemd/system/puma.service
    systemctl daemon-reload
    systemctl enable puma

    # Setup database
    log_info "Setting up database..."
    cd "$API_DIR"
    sudo -u $DEPLOY_USER bash -c "source ~/.bashrc && cd $API_DIR && RAILS_ENV=production bundle exec rails db:create db:migrate db:seed"

    # Build frontend
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    sudo -u $DEPLOY_USER npm install
    sudo -u $DEPLOY_USER npm run build

    # Start Puma
    log_info "Starting Puma service..."
    systemctl start puma

    log_info "Initial deployment completed successfully!"
    log_info "Next steps:"
    log_info "  1. Configure SSL: sudo certbot --nginx -d donations.projectsforasia.com"
    log_info "  2. Verify application: https://donations.projectsforasia.com"
    log_info "  3. Complete TICKET-136 to set up Google OAuth"
}

deploy() {
    log_info "Starting deployment..."

    check_user
    check_directory

    # Pull latest code
    log_info "Pulling latest code..."
    cd "$APP_DIR"
    git pull origin master

    # Update backend
    log_info "Updating backend..."
    cd "$API_DIR"
    bundle install --without development test
    RAILS_ENV=production bundle exec rails db:migrate

    # Update frontend
    log_info "Updating frontend..."
    cd "$FRONTEND_DIR"
    npm install
    npm run build

    # Restart Puma
    log_info "Restarting Puma..."
    sudo systemctl restart puma

    # Wait for Puma to start
    sleep 5

    # Check Puma status
    if sudo systemctl is-active --quiet puma; then
        log_info "Deployment completed successfully!"
        log_info "Puma is running"
    else
        log_error "Deployment completed but Puma failed to start!"
        log_info "Check logs: sudo journalctl -u puma -n 50"
        exit 1
    fi
}

# Main script
if [ "$1" == "--initial" ]; then
    initial_setup
else
    deploy
fi
