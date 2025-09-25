#!/bin/bash
# Pre-commit frontend validation with real tool execution
set -e

echo "🚀 Running frontend quality checks on donation_tracker_frontend..."

# Change to project root
cd "$(dirname "$0")/.."

# Verify we have the frontend directory
if [[ ! -d "donation_tracker_frontend" ]]; then
    echo "❌ Error: donation_tracker_frontend directory not found"
    exit 1
fi

cd donation_tracker_frontend

echo "🔍 Running ESLint on frontend files..."
if ! docker-compose exec -T frontend npm run lint; then
    echo "❌ ESLint found linting violations that must be fixed before committing"
    echo "💡 Fix automatically with: docker-compose exec frontend npm run lint:fix"
    exit 1
fi

echo "🎨 Running Prettier formatting checks..."
if ! docker-compose exec -T frontend npx prettier --check "src/**/*.{ts,tsx}"; then
    echo "❌ Prettier found formatting issues that must be fixed before committing"
    echo "💡 Fix automatically with: docker-compose exec frontend npm run format"
    exit 1
fi

echo "📝 Running TypeScript type checking..."
if ! docker-compose exec -T frontend npx tsc --noEmit; then
    echo "❌ TypeScript found type errors that must be fixed before committing"
    exit 1
fi

echo "🧪 Running Jest tests..."
if ! docker-compose exec -T frontend npm test -- --testPathPattern=App.test --watchAll=false --ci; then
    echo "❌ Tests are failing - all tests must pass before committing"
    exit 1
fi

echo "✅ All frontend quality checks passed!"
exit 0