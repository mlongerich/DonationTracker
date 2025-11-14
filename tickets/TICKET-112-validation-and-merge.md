## [TICKET-112] Validation & Merge to Master

**Status:** 📋 Planned
**Priority:** 🔴 High - Critical Gate
**Dependencies:**
- TICKET-109 (Donation Status Infrastructure) - **REQUIRED** ✅
- TICKET-110 (Import Service with Status) - **REQUIRED** ✅
- TICKET-111 (Pending Review UI) - **REQUIRED** ✅
**Created:** 2025-11-14
**Branch:** `feature/stripe-import-redesign` → **merge to master**

**⭐ CODE LIFECYCLE: PERMANENT - Validation Gate Before Production**

---

### User Story
As a developer, I want to validate the complete redesigned import system (infrastructure + service + UI) before merging to master to ensure no regressions and that the new design solves the original problems.

---

### Context

**Part of:** STRIPE_IMPORT_PLAN.md - Phase 4
**Why:** This is the critical validation gate before merging the redesign to master.
**Scope:** End-to-end validation of the entire redesigned system, client review, and merge approval.

**See:** STRIPE_IMPORT_PLAN.md sections:
- "Implementation Phases (Branch-Based)"
- "Testing Strategy"
- "Success Criteria"

---

### Acceptance Criteria

**Pre-Merge Validation:**
- [ ] Drop database on `feature/stripe-import-redesign` branch
- [ ] Run migrations (should create donations with status columns)
- [ ] Import CSV using rake task
- [ ] Verify import summary shows status breakdown
- [ ] Verify donations table has all expected statuses
- [ ] Verify duplicate subscriptions flagged with needs_attention
- [ ] Verify all statuses represented (succeeded, failed, refunded, canceled, needs_attention)
- [ ] Verify idempotency (re-run import, no duplicates created)

**UI Validation:**
- [ ] Open /admin page
- [ ] Verify Pending Review tab shows non-succeeded donations
- [ ] Verify status filter works (test each status)
- [ ] Verify date range filters work
- [ ] Verify pagination works
- [ ] Verify duplicate subscription warnings display
- [ ] Verify needs_attention_reason displays
- [ ] Verify status badge colors correct

**Testing:**
- [ ] All backend tests pass (`bundle exec rspec`)
- [ ] All frontend tests pass (`npm test`)
- [ ] Test coverage maintained (90% backend, 80% frontend)
- [ ] No linting errors (`bundle exec rubocop`, `npm run lint`)
- [ ] No security issues (`bundle exec brakeman`)
- [ ] E2E tests pass (if applicable)

**Client Review:**
- [ ] Demo the new admin UI to client
- [ ] Show import summary with status breakdown
- [ ] Show duplicate subscription flagging
- [ ] Show needs_attention donations
- [ ] Get client approval to merge

**Documentation:**
- [ ] Update DonationTracking.md with new workflow
- [ ] Update CLAUDE.md if patterns changed
- [ ] Update README if commands changed
- [ ] Verify STRIPE_IMPORT_PLAN.md is current

**Merge:**
- [ ] All checks passed
- [ ] Client approved
- [ ] Merge `feature/stripe-import-redesign` → `master`
- [ ] Push to origin master
- [ ] Delete feature branch (local and remote)
- [ ] Create TICKET-113 for cleanup

---

### Technical Approach

#### 1. Validation Script

```bash
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
docker-compose exec api rails db:drop db:create db:migrate
echo "✅ Database recreated"
echo ""

# 5. Import CSV
echo "📥 Importing CSV..."
docker-compose exec api rails stripe:import_csv
echo ""

# 6. Query donations by status
echo "📊 Donation counts by status:"
docker-compose exec api rails runner "
  puts 'Succeeded: ' + Donation.where(status: 'succeeded').count.to_s
  puts 'Failed: ' + Donation.where(status: 'failed').count.to_s
  puts 'Needs Attention: ' + Donation.where(status: 'needs_attention').count.to_s
  puts 'Refunded: ' + Donation.where(status: 'refunded').count.to_s
  puts 'Canceled: ' + Donation.where(status: 'canceled').count.to_s
  puts ''
  puts 'Duplicate subscriptions flagged: ' + Donation.where(duplicate_subscription_detected: true).count.to_s
"
echo ""

# 7. Test idempotency
echo "🔁 Testing idempotency (re-running import)..."
docker-compose exec api rails stripe:import_csv
echo ""

echo "📊 Donation counts after re-import (should be unchanged):"
docker-compose exec api rails runner "
  puts 'Succeeded: ' + Donation.where(status: 'succeeded').count.to_s
  puts 'Failed: ' + Donation.where(status: 'failed').count.to_s
  puts 'Needs Attention: ' + Donation.where(status: 'needs_attention').count.to_s
"
echo ""

echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3001/admin"
echo "2. Verify Pending Review tab shows donations"
echo "3. Test filters (status, date range)"
echo "4. Demo to client"
echo "5. If approved, run: git checkout master && git merge feature/stripe-import-redesign"
```

#### 2. Manual Validation Checklist

**Database Validation:**
```bash
# Verify donations table has new columns
docker-compose exec api rails runner "
  puts Donation.column_names
"
# Expected output should include: status, stripe_subscription_id, duplicate_subscription_detected, needs_attention_reason

# Check donation with needs_attention
docker-compose exec api rails runner "
  donation = Donation.where(status: 'needs_attention').first
  puts 'Status: ' + donation.status
  puts 'Reason: ' + donation.needs_attention_reason.to_s
  puts 'Duplicate: ' + donation.duplicate_subscription_detected.to_s
"
```

**API Validation:**
```bash
# Test Ransack filtering
curl 'http://localhost:3000/api/donations?q[status_not_eq]=succeeded&per_page=5'

# Test status-specific query
curl 'http://localhost:3000/api/donations?q[status_eq]=needs_attention'

# Test date range
curl 'http://localhost:3000/api/donations?q[date_gteq]=2025-01-01&q[date_lteq]=2025-01-31'
```

**UI Validation:**
1. Open http://localhost:3001/admin
2. Click "Pending Review" tab
3. Verify donations display
4. Test status filter dropdown (select "Failed", verify results)
5. Test date range (set From Date, verify results)
6. Test pagination (if > 25 results)
7. Verify duplicate subscription warning icon appears
8. Verify needs_attention_reason displays

#### 3. Client Demo Script

**Demo Flow:**
1. Show import summary:
   - "Here's the new import summary showing 1,244 succeeded, 86 failed, 28 need attention"

2. Show admin UI:
   - "This is the new admin section for reviewing issues"
   - "See the Pending Review tab shows all non-succeeded donations"

3. Show filtering:
   - "You can filter by status - let me show just failed payments"
   - "You can also filter by date range"

4. Show duplicate detection:
   - "Here's a donation flagged as a duplicate subscription"
   - "The system detected the same child has multiple subscription IDs"
   - "You can investigate and resolve this manually"

5. Show needs_attention:
   - "Donations that couldn't be fully processed are marked 'needs attention'"
   - "The reason field explains what needs to be fixed"

6. Show idempotency:
   - "If we re-run the import, no duplicates are created"
   - "Safe to run multiple times"

#### 4. Merge Process

```bash
# 1. Ensure validation passed
bash scripts/validate-stripe-redesign.sh

# 2. Ensure all changes committed on feature branch
git status
# Should show "nothing to commit, working tree clean"

# 3. Switch to master
git checkout master

# 4. Merge feature branch
git merge feature/stripe-import-redesign

# 5. Push to origin
git push origin master

# 6. Delete feature branch (optional, can keep for reference)
git branch -d feature/stripe-import-redesign
git push origin --delete feature/stripe-import-redesign

# 7. Verify master is clean
git status
docker-compose exec api rails db:drop db:create db:migrate
docker-compose exec api rails stripe:import_csv
```

---

### Files to Create
- `scripts/validate-stripe-redesign.sh` (validation script)

### Files to Modify
- `DonationTracking.md` (document new import workflow)
- `CLAUDE.md` (if new patterns were added)
- `README.md` (if commands changed)

### Files NOT to Touch
- All implementation files (already complete in TICKET-109, 110, 111)

---

### Related Tickets

**Depends On:**
- **TICKET-109** (Donation Status Infrastructure) - **REQUIRED**
- **TICKET-110** (Import Service) - **REQUIRED**
- **TICKET-111** (Pending Review UI) - **REQUIRED**

**This Redesign:**
- **TICKET-113**: Cleanup (runs AFTER merge to master)

**Replaces:**
- TICKET-076 (Failed Stripe Payments Tracking) - **PAUSED**, replaced by this redesign

**See:**
- STRIPE_IMPORT_PLAN.md - Success criteria and validation strategy
- backup/ticket-076-complete - Reference for what we replaced

---

### Success Criteria

**Pre-Merge Validation Passed:**
- [ ] All tests pass (backend + frontend)
- [ ] Import creates donations with correct statuses
- [ ] Duplicate subscriptions flagged
- [ ] Idempotency verified (no duplicates on re-import)
- [ ] UI displays pending donations correctly
- [ ] Filters work (status, date range)
- [ ] No linting or security errors

**Client Approval:**
- [ ] Demonstrated new admin UI
- [ ] Demonstrated status tracking
- [ ] Demonstrated duplicate detection
- [ ] Client approved merge

**Merge Complete:**
- [ ] Feature branch merged to master
- [ ] Master pushed to origin
- [ ] Can drop DB on master and re-import successfully
- [ ] TICKET-113 created for cleanup

**Ready for Next Ticket:**
- [ ] TICKET-113 can remove any remaining old code on master

---

### Known Issues to Verify

**From STRIPE_IMPORT_PLAN.md:**
1. **Duplicate Subscriptions (Lines 805 & 807):**
   - Verify flagged as needs_attention
   - Verify duplicate_subscription_detected = true
   - Verify reason includes "sub_OLD" ID

2. **Non-Succeeded Payments:**
   - Verify 86+ failed donations imported (not skipped)
   - Verify status = 'failed'

3. **Metadata Support:**
   - Verify fallback to nickname parsing works (current CSV has no metadata)
   - Verify ready for future webhook integration

4. **Idempotency:**
   - Verify subscription_id + child_id uniqueness works
   - Verify re-import doesn't create duplicates

---

### Rollback Plan

**If validation fails:**
1. Stay on `feature/stripe-import-redesign` branch
2. Fix issues, commit to branch
3. Re-run validation
4. Do NOT merge until all checks pass

**If issues found after merge:**
1. Can revert merge: `git revert -m 1 <merge_commit_sha>`
2. Or create hotfix branch from master
3. Or checkout backup/ticket-076-complete for reference

---

### Notes
- **No Code Changes:** This ticket is validation and merge only, no new code
- **Client Approval Required:** Do not merge without client seeing and approving
- **Testing:** All tests must pass before merge
- **Documentation:** Update docs before merge
- **Database:** Will drop and recreate on master after merge (pre-production)
- **Branch Cleanup:** Can delete feature branch after merge (backup branch preserved)
- **Next Ticket:** TICKET-113 will clean up any remaining old code

---

*Created: 2025-11-14*
*Part of STRIPE_IMPORT_PLAN.md Phase 4 (Validation & Merge)*
