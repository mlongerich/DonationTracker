#!/bin/bash
# scripts/validate-stripe-redesign.sh

echo "🧪 Validating Stripe Import Redesign"
echo "====================================="
echo ""

# 1. Ensure on feature branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/stripe-import-redesign" ]; then
  echo "❌ ERROR: Must be on feature/stripe-import-redesign branch"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

echo "✅ On feature/stripe-import-redesign branch"
echo ""

# 2. Run backend tests
echo "🧪 Running backend tests..."
docker-compose exec api bundle exec rspec
if [ $? -ne 0 ]; then
  echo "❌ Backend tests failed"
  exit 1
fi
echo "✅ Backend tests passed"
echo ""

# 3. Run frontend tests
echo "🧪 Running frontend tests..."
docker-compose exec frontend npm test -- --watchAll=false
if [ $? -ne 0 ]; then
  echo "❌ Frontend tests failed"
  exit 1
fi
echo "✅ Frontend tests passed"
echo ""

# 4. Drop and recreate database
echo "🗑️  Dropping database..."
docker-compose exec -T api bash -c "cd /app && bundle exec rails db:drop db:create db:migrate"
echo "✅ Database recreated"
echo ""

# 5. Import CSV
echo "📥 Importing CSV..."
docker-compose exec -T api bash -c "cd /app && bundle exec rails stripe:import_csv"
echo ""

# 6. Query donations by status
echo "📊 Donation counts by status:"
docker-compose exec -T api bash -c "cd /app && bundle exec rails runner \"
  puts 'Succeeded: ' + Donation.where(status: 'succeeded').count.to_s
  puts 'Failed: ' + Donation.where(status: 'failed').count.to_s
  puts 'Needs Attention: ' + Donation.where(status: 'needs_attention').count.to_s
  puts 'Refunded: ' + Donation.where(status: 'refunded').count.to_s
  puts 'Canceled: ' + Donation.where(status: 'canceled').count.to_s
  puts ''
  puts 'Duplicate subscriptions flagged: ' + Donation.where(duplicate_subscription_detected: true).count.to_s
\""
echo ""

# 7. Test idempotency
echo "🔁 Testing idempotency (re-running import)..."
docker-compose exec -T api bash -c "cd /app && bundle exec rails stripe:import_csv"
echo ""

echo "📊 Donation counts after re-import (should be unchanged):"
docker-compose exec -T api bash -c "cd /app && bundle exec rails runner \"
  puts 'Succeeded: ' + Donation.where(status: 'succeeded').count.to_s
  puts 'Failed: ' + Donation.where(status: 'failed').count.to_s
  puts 'Needs Attention: ' + Donation.where(status: 'needs_attention').count.to_s
\""
echo ""

echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3001/admin"
echo "2. Verify Pending Review tab shows donations"
echo "3. Test filters (status, date range)"
echo "4. Demo to client"
echo "5. If approved, run: git checkout master && git merge feature/stripe-import-redesign"
