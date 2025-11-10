#!/bin/bash
# Pre-commit frontend validation (optimized for speed)
set -e

echo "🚀 Running frontend quality checks on donation_tracker_frontend..."

# Change to project root
cd "$(dirname "$0")/.."

# Verify we have the frontend directory
if [[ ! -d "donation_tracker_frontend" ]]; then
    echo "❌ Error: donation_tracker_frontend directory not found"
    exit 1
fi

# Use local npm if available (faster), fallback to docker-compose
if command -v npm &> /dev/null && [[ -f "donation_tracker_frontend/package.json" ]]; then
    RUNNER="npm --prefix donation_tracker_frontend run"
    NPXRUNNER="npx --prefix donation_tracker_frontend"
else
    RUNNER="docker-compose run --rm --no-deps frontend npm run"
    NPXRUNNER="docker-compose run --rm --no-deps frontend npx"
fi

echo "🔍 Running ESLint on frontend files..."
if ! $RUNNER lint 2>&1 | head -50; then
    echo "❌ ESLint found linting violations that must be fixed before committing"
    echo "💡 Fix automatically with: cd donation_tracker_frontend && npm run lint:fix"
    exit 1
fi

echo "🎨 Running Prettier formatting checks..."
if ! $NPXRUNNER prettier --check "src/**/*.{ts,tsx}" 2>&1 | head -50; then
    echo "❌ Prettier found formatting issues that must be fixed before committing"
    echo "💡 Fix automatically with: cd donation_tracker_frontend && npm run format"
    exit 1
fi

echo "📝 Running TypeScript type checking..."
if ! $NPXRUNNER tsc --noEmit 2>&1 | head -50; then
    echo "❌ TypeScript found type errors that must be fixed before committing"
    exit 1
fi

echo "🧪 Running Jest unit tests..."
if ! $RUNNER test:ci 2>&1 | tail -100; then
    echo "❌ Jest tests failed - must fix before committing"
    exit 1
fi

echo "🎭 Running Cypress E2E tests (isolated test environment)..."
# cypress:e2e script handles starting/stopping the E2E API automatically
if ! $RUNNER cypress:e2e 2>&1 | tail -100; then
    echo "❌ Cypress E2E tests failed - must fix before committing"
    exit 1
fi

echo "✅ All frontend quality checks and tests passed!"
exit 0
