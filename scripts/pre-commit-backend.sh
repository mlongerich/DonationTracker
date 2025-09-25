#!/bin/bash
# Pre-commit backend validation with real tool execution
set -e

echo "🚀 Running backend quality checks on donation_tracker_api..."

# Change to project root
cd "$(dirname "$0")/.."

# Verify we have the backend directory
if [[ ! -d "donation_tracker_api" ]]; then
    echo "❌ Error: donation_tracker_api directory not found"
    exit 1
fi

cd donation_tracker_api

echo "🔍 Running RuboCop on backend files..."
if ! docker-compose exec -T api bundle exec rubocop; then
    echo "❌ RuboCop found style violations that must be fixed before committing"
    echo "💡 Fix automatically with: docker-compose exec api bundle exec rubocop --auto-correct"
    exit 1
fi

echo "🔒 Running Brakeman security checks..."
if ! docker-compose exec -T api bundle exec brakeman --quiet --exit-on-warn; then
    echo "❌ Brakeman found security vulnerabilities that must be addressed"
    exit 1
fi

echo "🧪 Running RSpec tests..."
if ! docker-compose exec -T api bundle exec rspec; then
    echo "❌ Tests are failing - all tests must pass before committing"
    exit 1
fi

echo "✅ All backend quality checks passed!"
exit 0