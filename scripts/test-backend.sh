#!/bin/bash
# Run backend RSpec tests in test environment
# Usage: bash scripts/test-backend.sh [rspec args]
# Example: bash scripts/test-backend.sh spec/models/donation_spec.rb

set -e

echo "🧪 Running backend tests in TEST environment..."
docker-compose exec -T api bash -c "cd /app && RAILS_ENV=test bundle exec rspec $*"
