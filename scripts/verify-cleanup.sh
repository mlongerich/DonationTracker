#!/bin/bash
# scripts/verify-cleanup.sh
# Verifies that old failed_stripe_payments system has been completely removed

echo "🧹 Verifying Old System Cleanup"
echo "================================"
echo ""

# 1. Check for failed_stripe_payments references in backend
echo "🔍 Searching backend for 'failed_stripe_payment'..."
BACKEND_REFS=$(grep -r "failed_stripe_payment" donation_tracker_api/app donation_tracker_api/spec --exclude-dir=coverage 2>/dev/null | wc -l)
if [ $BACKEND_REFS -gt 0 ]; then
  echo "⚠️  Found references:"
  grep -r "failed_stripe_payment" donation_tracker_api/app donation_tracker_api/spec --exclude-dir=coverage
  echo ""
else
  echo "✅ No backend references found"
  echo ""
fi

# 2. Check for FailedPayment references in frontend
echo "🔍 Searching frontend for 'FailedPayment'..."
FRONTEND_REFS=$(grep -r "FailedPayment" donation_tracker_frontend/src --exclude-dir=coverage 2>/dev/null | wc -l)
if [ $FRONTEND_REFS -gt 0 ]; then
  echo "⚠️  Found references:"
  grep -r "FailedPayment" donation_tracker_frontend/src --exclude-dir=coverage
  echo ""
else
  echo "✅ No frontend references found"
  echo ""
fi

# 3. Check for routes
echo "🔍 Checking routes for failed_stripe_payments..."
ROUTE_REFS=$(grep "failed_stripe_payments" donation_tracker_api/config/routes.rb 2>/dev/null | wc -l)
if [ $ROUTE_REFS -gt 0 ]; then
  echo "⚠️  Found route:"
  grep "failed_stripe_payments" donation_tracker_api/config/routes.rb
  echo ""
else
  echo "✅ No routes found"
  echo ""
fi

# 4. Check schema for table
echo "🔍 Checking schema for failed_stripe_payments table..."
SCHEMA_REFS=$(grep "create_table.*failed_stripe_payments" donation_tracker_api/db/schema.rb 2>/dev/null | wc -l)
if [ $SCHEMA_REFS -gt 0 ]; then
  echo "⚠️  Found table in schema:"
  grep "create_table.*failed_stripe_payments" donation_tracker_api/db/schema.rb
  echo ""
else
  echo "✅ No table in schema"
  echo ""
fi

# 5. List any old migrations (if not deleted)
echo "🔍 Checking for failed_stripe_payments migrations..."
MIGRATION_FILES=$(find donation_tracker_api/db/migrate -name "*failed_stripe_payments*" 2>/dev/null | wc -l)
if [ $MIGRATION_FILES -gt 0 ]; then
  echo "⚠️  Found migration files:"
  find donation_tracker_api/db/migrate -name "*failed_stripe_payments*"
  echo ""
  echo "NOTE: If these exist, they should be deleted."
  echo ""
else
  echo "✅ No migration files found"
  echo ""
fi

echo ""
echo "✅ Cleanup verification complete!"
echo ""
echo "Summary:"
echo "  Backend references: $BACKEND_REFS"
echo "  Frontend references: $FRONTEND_REFS"
echo "  Route references: $ROUTE_REFS"
echo "  Schema references: $SCHEMA_REFS"
echo "  Migration files: $MIGRATION_FILES"
