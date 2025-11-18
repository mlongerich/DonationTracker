## [TICKET-113] Cleanup Old Failed Payments System

**Status:** ✅ Complete
**Priority:** 🟢 Low - Housekeeping
**Dependencies:**
- TICKET-112 (Validation & Merge) - **REQUIRED** ✅ (must merge first)
**Created:** 2025-11-14
**Completed:** 2025-11-17
**Branch:** `master` (AFTER merge)

**⭐ CODE LIFECYCLE: CLEANUP - Removing Old Code**

---

### User Story
As a developer, I want to remove any remaining old code, migrations, or references to the failed_stripe_payments system now that the new design is merged and validated.

---

### Context

**Part of:** docs/STRIPE_IMPORT_PLAN.md - Phase 5
**Why:** After merging the redesign to master, we need to clean up any remaining traces of the old system.
**Scope:** Remove old migrations, update documentation, verify no old code remains.

**Note:** Most old code was already deleted during branch cleanup (see docs/STRIPE_IMPORT_PLAN.md "Branch Cleanup" section). This ticket handles any remaining cleanup on master.

**See:** docs/STRIPE_IMPORT_PLAN.md section "Branch Cleanup (Completed)"

---

### Acceptance Criteria

**Verification (What Should Already Be Gone):**
- [ ] Verify no failed_stripe_payments table in schema
- [ ] Verify no failed_stripe_payment.rb model
- [ ] Verify no failed_stripe_payments_controller.rb
- [ ] Verify no failed_stripe_payment_presenter.rb
- [ ] Verify no FailedPaymentsSection component
- [ ] Verify no FailedPaymentList component
- [ ] Verify no failedPayment.ts type
- [ ] Verify no routes to /api/failed_stripe_payments
- [ ] Verify no imports of FailedPayment type

**Documentation Updates:**
- [ ] Update docs/DonationTracking.md (remove failed_stripe_payments references)
- [ ] Update CLAUDE.md (remove failed_stripe_payments patterns if present)
- [ ] Update docs/STRIPE_IMPORT_PLAN.md status to "✅ COMPLETE"
- [ ] Update TICKET-076 status to "❌ SUPERSEDED BY TICKET-109/110/111"

**Final Verification:**
- [ ] All tests pass on master
- [ ] No references to "failed_stripe_payment" in codebase (grep)
- [ ] No references to "FailedPayment" type in frontend (grep)
- [ ] Import works on master
- [ ] Admin UI works on master

**Optional (Archive):**
- [ ] Tag backup/ticket-076-complete branch for preservation
- [ ] Add note to README about ticket numbering skip (no TICKET-076 in master)

---

### Technical Approach

#### 1. Verification Script

```bash
#!/bin/bash
# scripts/verify-cleanup.sh

echo "🧹 Verifying Old System Cleanup"
echo "================================"
echo ""

# 1. Check for failed_stripe_payments references in backend
echo "🔍 Searching backend for 'failed_stripe_payment'..."
BACKEND_REFS=$(grep -r "failed_stripe_payment" donation_tracker_api/app donation_tracker_api/spec --exclude-dir=coverage | wc -l)
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
FRONTEND_REFS=$(grep -r "FailedPayment" donation_tracker_frontend/src --exclude-dir=coverage | wc -l)
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
ROUTE_REFS=$(grep "failed_stripe_payments" donation_tracker_api/config/routes.rb | wc -l)
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
SCHEMA_REFS=$(grep "create_table.*failed_stripe_payments" donation_tracker_api/db/schema.rb | wc -l)
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
MIGRATION_FILES=$(find donation_tracker_api/db/migrate -name "*failed_stripe_payments*" | wc -l)
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

echo "🧪 Running tests..."
docker-compose exec api bundle exec rspec --fail-fast
docker-compose exec frontend npm test -- --watchAll=false --bail

echo ""
echo "✅ Cleanup verification complete!"
```

#### 2. Documentation Updates

```markdown
# docs/DonationTracking.md - Remove failed_stripe_payments section

# OLD (remove):
### Failed Stripe Payments
- Table: failed_stripe_payments
- Purpose: Track non-succeeded Stripe transactions
- Fields: stripe_transaction_id, donor_name, donor_email, amount_cents, status, etc.

# NEW (already present):
### Donations
- Table: donations
- Purpose: Track all donations (successful and problematic)
- Status field: succeeded, failed, refunded, canceled, needs_attention
- Fields: status, duplicate_subscription_detected, needs_attention_reason, etc.
```

#### 3. Final Search & Destroy

```bash
# Search for any remaining references
grep -r "FailedStripePayment" donation_tracker_api/
grep -r "failed_stripe_payment" donation_tracker_api/
grep -r "FailedPayment" donation_tracker_frontend/

# If found, remove them
# (Should all be already removed during branch cleanup)
```

---

### Files to Verify Deleted
*These should already be gone from branch cleanup:*
- ~~`app/models/failed_stripe_payment.rb`~~
- ~~`app/controllers/api/failed_stripe_payments_controller.rb`~~
- ~~`app/presenters/failed_stripe_payment_presenter.rb`~~
- ~~`db/migrate/*_create_failed_stripe_payments.rb`~~
- ~~`spec/models/failed_stripe_payment_spec.rb`~~
- ~~`spec/presenters/failed_stripe_payment_presenter_spec.rb`~~
- ~~`spec/requests/api/failed_stripe_payments_spec.rb`~~
- ~~`spec/factories/failed_stripe_payments.rb`~~
- ~~`src/components/FailedPaymentsSection.tsx`~~
- ~~`src/components/FailedPaymentsSection.test.tsx`~~
- ~~`src/components/FailedPaymentList.tsx`~~
- ~~`src/components/FailedPaymentList.test.tsx`~~
- ~~`src/types/failedPayment.ts`~~

### Files to Modify
- `docs/DonationTracking.md` (remove failed_stripe_payments references)
- `CLAUDE.md` (remove failed_stripe_payments patterns if present)
- `docs/STRIPE_IMPORT_PLAN.md` (mark as complete)
- `TICKET-076-failed-stripe-payments-tracking.md` (mark as superseded)
- `README.md` (optional: note about ticket numbering)

### Files to Create
- `scripts/verify-cleanup.sh` (verification script)

---

### Related Tickets

**Depends On:**
- **TICKET-112** (Validation & Merge) - **REQUIRED** - Must be merged to master first

**This Redesign (Complete):**
- TICKET-109 (Donation Status Infrastructure) - ✅ Complete
- TICKET-110 (Import Service) - ✅ Complete
- TICKET-111 (Pending Review UI) - ✅ Complete
- TICKET-112 (Validation & Merge) - ✅ Complete
- **TICKET-113 (This Ticket)** - Final cleanup

**Superseded:**
- **TICKET-076** (Failed Stripe Payments Tracking) - **SUPERSEDED**

**Enables:**
- TICKET-026 (Stripe Webhook Integration) - Can proceed with metadata-aligned design

**See:**
- docs/STRIPE_IMPORT_PLAN.md - Complete redesign plan
- backup/ticket-076-complete - Archived for reference

---

### Success Criteria

**Verification Passed:**
- [ ] No failed_stripe_payments references in backend code
- [ ] No FailedPayment references in frontend code
- [ ] No failed_stripe_payments table in schema
- [ ] No failed_stripe_payments routes
- [ ] No failed_stripe_payments migrations
- [ ] All tests pass on master

**Documentation Updated:**
- [ ] docs/DonationTracking.md references removed
- [ ] CLAUDE.md references removed (if any)
- [ ] docs/STRIPE_IMPORT_PLAN.md marked complete
- [ ] TICKET-076 marked superseded

**System Validated:**
- [ ] Import works on master
- [ ] Admin UI works on master
- [ ] No regressions introduced

**Archive (Optional):**
- [ ] backup/ticket-076-complete tagged for preservation
- [ ] README notes about skipped ticket numbers

---

### Rollback Plan

**If Issues Found:**
1. This ticket only removes already-deleted code and updates docs
2. If something breaks, the issue is likely in TICKET-109/110/111
3. Can reference backup/ticket-076-complete for comparison
4. Can revert documentation changes easily

**No Database Changes:**
- This ticket doesn't touch migrations or schema
- Safe to run on master

---

### Notes
- **Most Work Already Done:** Branch cleanup removed 99% of old code
- **This Is Verification:** Mainly verifying nothing slipped through
- **Documentation Focus:** Primary work is updating docs
- **Low Risk:** No database changes, no logic changes
- **Final Ticket:** Completes docs/STRIPE_IMPORT_PLAN.md implementation
- **Testing:** Run full test suite to ensure no hidden dependencies

---

### Completion Checklist

```bash
# 1. Verify cleanup
bash scripts/verify-cleanup.sh

# 2. Update documentation
# Edit docs/DonationTracking.md, CLAUDE.md, docs/STRIPE_IMPORT_PLAN.md, TICKET-076

# 3. Run tests
docker-compose exec api bundle exec rspec
docker-compose exec frontend npm test -- --watchAll=false

# 4. Commit cleanup
git add .
git commit -m "cleanup: remove old failed_stripe_payments system (TICKET-113)"
git push origin master

# 5. Mark docs/STRIPE_IMPORT_PLAN.md as complete
# Edit: **Status:** ✅ COMPLETE

# 6. Celebrate! 🎉
echo "✅ docs/STRIPE_IMPORT_PLAN.md implementation complete!"
echo "✅ Tickets 109, 110, 111, 112, 113 - all done!"
echo "✅ Ready for TICKET-026 (Stripe Webhook Integration)"
```

---

*Created: 2025-11-14*
*Part of docs/STRIPE_IMPORT_PLAN.md Phase 5 (Cleanup)*
*Final ticket in redesign sequence*
