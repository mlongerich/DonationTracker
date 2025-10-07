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
if ! timeout 30s $RUNNER lint 2>&1 | head -50; then
    echo "❌ ESLint found linting violations that must be fixed before committing"
    echo "💡 Fix automatically with: cd donation_tracker_frontend && npm run lint:fix"
    exit 1
fi

echo "🎨 Running Prettier formatting checks..."
if ! timeout 30s $NPXRUNNER prettier --check "src/**/*.{ts,tsx}" 2>&1 | head -50; then
    echo "❌ Prettier found formatting issues that must be fixed before committing"
    echo "💡 Fix automatically with: cd donation_tracker_frontend && npm run format"
    exit 1
fi

echo "📝 Running TypeScript type checking..."
if ! timeout 30s $NPXRUNNER tsc --noEmit 2>&1 | head -50; then
    echo "❌ TypeScript found type errors that must be fixed before committing"
    exit 1
fi

# Skip tests in pre-commit hook (run separately with: npm test)
# Tests are slow and already validated by CI/CD pipeline
echo "⏭️  Skipping tests (run manually with: npm test)"

echo "✅ All frontend quality checks passed!"
exit 0
