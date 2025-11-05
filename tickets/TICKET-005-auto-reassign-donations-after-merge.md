## [TICKET-005] Auto-Reassign Donations After Donor Merge

**Status:** 🔵 In Progress
**Priority:** 🟡 Medium
**Effort:** M (Medium - 6-7 hours)
**Dependencies:** ✅ TICKET-004 (donor merge - complete), ✅ Donation model exists
**Created:** 2025-10-08
**Updated:** 2025-11-05

### User Story
As an admin, after merging donors, I want their donations and sponsorships automatically reassigned to the merged donor so that donation history is preserved and I have accurate giving records. Additionally, future Stripe imports using old customer IDs should automatically be assigned to the merged donor.

### Problem Statement

**Current State:**
- `DonorMergeService` creates merged donor with `merged_into_id` tracking
- Donations and sponsorships remain with old donor_id (orphaned)
- Frontend correctly hides merged donors from search (manual protection ✅)
- Stripe imports use `stripe_customer_id` on donations table (not donor table)

**Desired State:**
1. **One-Time Reassignment:** When merging, reassign all donations/sponsorships to merged donor
2. **Future Import Auto-Redirect:** CSV/webhook imports using old `stripe_customer_id` should find merged donor
3. **Manual Protection:** Already working (frontend filters exclude merged donors)

### Acceptance Criteria

#### Phase 1: One-Time Reassignment
- [ ] Backend: Extend `DonorMergeService` to reassign donations
- [ ] Backend: Extend `DonorMergeService` to reassign sponsorships
- [ ] Backend: Reassign AFTER creating merged donor (need new ID)
- [ ] Backend: Preserve all donation/sponsorship data (amount, date, stripe fields)
- [ ] Backend: Return counts in merge response: `donations_reassigned`, `sponsorships_reassigned`
- [ ] Backend: Transaction ensures atomicity (rollback on failure)
- [ ] RSpec: 5 tests for reassignment logic

#### Phase 2: Future Stripe Import Auto-Redirect
- [ ] Backend: Modify `DonorService.find_or_update_by_email` to check `stripe_customer_id`
- [ ] Backend: Follow merge chain if donor has `merged_into_id`
- [ ] Backend: Return `redirected: true` flag when merge redirect happens
- [ ] Backend: Update `StripePaymentImportService` to pass `stripe_customer_id`
- [ ] RSpec: 4 tests for stripe_customer_id lookup + merge redirect
- [ ] RSpec: 3 tests for import service integration

#### Phase 3: Frontend & E2E
- [ ] Frontend: Display reassignment counts in merge success message (optional)
- [ ] Cypress: Verify donations visible under merged donor after merge
- [ ] Cypress: Verify sponsorships visible under merged donor after merge

### Technical Implementation

#### Phase 1: DonorMergeService Reassignment

**Current merge flow:**
1. `temporarily_change_emails` (free up uniqueness constraint)
2. `soft_delete_source_donors` (discard old donors)
3. `create_merged_donor` (new donor with merged fields)
4. Set `merged_into_id` on source donors

**NEW merge flow:**
1. `temporarily_change_emails`
2. `soft_delete_source_donors`
3. `create_merged_donor` (get new ID)
4. **NEW:** `reassign_donations(merged_donor_id)` (bulk update donor_id)
5. **NEW:** `reassign_sponsorships(merged_donor_id)` (bulk update donor_id)
6. Set `merged_into_id` on source donors
7. **NEW:** Return counts in result hash

```ruby
# app/services/donor_merge_service.rb (CHANGES)

def perform_merge_transaction
  merged_attributes = build_merged_attributes

  merged_donor = Donor.transaction do
    temporarily_change_emails
    soft_delete_source_donors
    new_donor = create_merged_donor(merged_attributes)

    # NEW: Reassign associations after creating merged donor
    @donations_count = reassign_donations(new_donor.id)
    @sponsorships_count = reassign_sponsorships(new_donor.id)

    new_donor
  end

  # NEW: Return counts for frontend display
  {
    merged_donor: merged_donor,
    donations_reassigned: @donations_count,
    sponsorships_reassigned: @sponsorships_count
  }
end

private

def reassign_donations(merged_donor_id)
  Donation.where(donor_id: @donor_ids)
          .update_all(donor_id: merged_donor_id)
end

def reassign_sponsorships(merged_donor_id)
  Sponsorship.where(donor_id: @donor_ids)
             .update_all(donor_id: merged_donor_id)
end
```

#### Phase 2: DonorService Stripe Redirect

**Current behavior:**
- Looks up donor by email only
- Creates new donor if not found

**NEW behavior:**
- Check for existing donations with `stripe_customer_id` first (more reliable)
- If found, use that donor
- If donor has `merged_into_id`, follow chain to merged donor
- Return `redirected: true` flag

```ruby
# app/services/donor_service.rb (NEW METHOD)

def self.find_or_update_by_email_or_stripe_customer(donor_attributes, stripe_customer_id, transaction_date)
  # NEW: Priority 1 - Check for existing donor by stripe_customer_id
  if stripe_customer_id.present?
    existing_donation = Donation.where(stripe_customer_id: stripe_customer_id).first

    if existing_donation
      donor = existing_donation.donor

      # NEW: Follow merge chain if donor was merged
      while donor.merged_into_id.present?
        donor = Donor.find(donor.merged_into_id)
      end

      return {
        donor: donor,
        created: false,
        redirected: existing_donation.donor.merged_into_id.present?
      }
    end
  end

  # Fallback: Priority 2 - Lookup by email (existing logic)
  find_or_update_by_email(donor_attributes, transaction_date)
end
```

**Update StripePaymentImportService:**

```ruby
# app/services/stripe_payment_import_service.rb (LINE 25-31)

# OLD:
donor_result = DonorService.find_or_update_by_email(...)

# NEW:
donor_result = DonorService.find_or_update_by_email_or_stripe_customer(
  { name: @csv_row["Billing Details Name"], email: @csv_row["Cust Email"] },
  @csv_row["Cust ID"], # NEW: Pass stripe_customer_id
  DateTime.parse(@csv_row["Created Formatted"])
)
```

### Edge Cases

1. **Multi-level merge chains:** A→B, then B→C (while loop handles recursive lookup)
2. **Sponsorship uniqueness validation:** May conflict after reassignment (validate in tests)
3. **Archived donors in merge chain:** Skip discarded when following chain (use `Donor.find` not `.kept`)
4. **Donors with no donations/sponsorships:** Counts return 0 (still succeeds)

### Testing Strategy

**RSpec Tests (12 new tests):**

1. **`donor_merge_service_spec.rb`** (5 tests)
   - Reassigns all donations from source donors to merged donor
   - Reassigns all sponsorships from source donors to merged donor
   - Returns correct donation/sponsorship counts
   - Preserves all donation data (amount, date, stripe fields)
   - Handles donors with no donations/sponsorships (counts = 0)

2. **`donor_service_spec.rb`** (4 tests)
   - Finds donor by stripe_customer_id (ignores email)
   - Follows merge chain (A→B→C returns C)
   - Returns `redirected: true` when donor was merged
   - Handles missing stripe_customer_id (falls back to email)

3. **`stripe_payment_import_service_spec.rb`** (3 tests)
   - Creates donation for merged donor (not original)
   - Passes stripe_customer_id to DonorService
   - Handles merged donor with multiple stripe_customer_ids

**Cypress E2E (2 tests):**
- Merge donors → verify donations appear under merged donor's history
- Merge donors → verify sponsorships appear under merged donor's relationships

### Files to Modify

**Backend:**
- `donation_tracker_api/app/services/donor_merge_service.rb` (add reassignment methods)
- `donation_tracker_api/app/services/donor_service.rb` (add stripe_customer_id lookup)
- `donation_tracker_api/app/services/stripe_payment_import_service.rb` (pass stripe_customer_id)
- `donation_tracker_api/spec/services/donor_merge_service_spec.rb` (5 new tests)
- `donation_tracker_api/spec/services/donor_service_spec.rb` (4 new tests)
- `donation_tracker_api/spec/services/stripe_payment_import_service_spec.rb` (3 new tests)

**Frontend (optional):**
- `donation_tracker_frontend/src/components/DonorMergeModal.tsx` (show reassignment counts)

**Documentation:**
- `CLAUDE.md` - Update donor merge pattern section
- `tickets/TICKET-005-auto-reassign-donations-after-merge.md` - Update status to complete

### Success Criteria
- [ ] All donations reassigned during merge
- [ ] All sponsorships reassigned during merge
- [ ] Future Stripe imports use merged donor (auto-redirect)
- [ ] Manual donations cannot select merged donors (already working ✅)
- [ ] All RSpec tests pass (12 new tests)
- [ ] Cypress E2E tests pass (2 tests)
- [ ] PaperTrail audit trail preserved
- [ ] Transaction rollback on any failure

### Estimated Time
- Backend reassignment logic: 2 hours
- Stripe redirect logic: 1.5 hours
- RSpec tests: 2.5 hours
- Cypress E2E: 1 hour
- **Total: ~7 hours**

### Related Tickets
- TICKET-004: Manual Donor Merge with Field Selection ✅ (prerequisite - complete)
- TICKET-070: Stripe CSV Import Foundation ✅ (uses DonorService)
- TICKET-071: Stripe CSV Batch Import Task 🟡 (will benefit from auto-redirect)
