## [TICKET-118] Add Source Tracking to Donations and Sponsorships

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Size:** M (Medium - 3-4 hours)
**Dependencies:** None
**Blocks:** TICKET-091 (CSV Import GUI - enables smart clear database)
**Created:** 2025-11-17
**Updated:** 2025-11-19

**⭐ CODE LIFECYCLE: PERMANENT - Audit Trail Feature**

---

### User Story
As an admin, I want to know whether each donation and sponsorship was added via CSV import, webhook, or manual entry so that I can trace data provenance, audit imports, troubleshoot data issues, and selectively delete CSV imports without affecting manual data.

---

### Context

**Why:** Currently there's no way to distinguish donations and sponsorships created by:
1. CSV import (historical one-time bulk import)
2. Webhook (future real-time Stripe sync)
3. Manual entry (admin creating via UI)

**Use Cases:**
- **Audit Trail:** "Where did this donation/sponsorship come from?"
- **Troubleshooting:** "Was this imported or manually entered?"
- **Data Quality:** "How many donations came from CSV vs webhooks?"
- **Import Validation:** "Which donations need to be re-imported if CSV fails?"
- **Smart Deletion (TICKET-091):** "Clear CSV imports without deleting manual data"
- **Sponsorship Safety:** "Preserve CSV-created sponsorships that have manual donations"

**Scope:** Add `source` enum field to donations AND sponsorships tables, update all creation paths, display in UI

**Why Sponsorships Need Source Tracking:**
- Sponsorships auto-created from CSV imports (`StripePaymentImportService`)
- User may manually add donations to CSV-created sponsorships later
- Need to preserve sponsorships with manual donations when clearing CSV imports
- Cannot safely delete CSV sponsorship if it has manual donations attached

---

### Acceptance Criteria

**Backend - Donations:**
- [ ] Add migration: `source` enum column to donations table (manual, csv_import, webhook)
- [ ] Update Donation model with enum validation
- [ ] Update StripePaymentImportService to set `source: 'csv_import'` on donations
- [ ] Update DonationsController to set `source: 'manual'` (default)
- [ ] Update DonationPresenter to include `source` field
- [ ] Add donation model validation tests (enum values)
- [ ] Add donation service tests (source set correctly)
- [ ] Add donation controller tests (source set on create)

**Backend - Sponsorships:**
- [ ] Add migration: `source` enum column to sponsorships table (manual, csv_import, webhook)
- [ ] Update Sponsorship model with enum validation
- [ ] Update StripePaymentImportService to set `source: 'csv_import'` on auto-created sponsorships
- [ ] Update SponsorshipsController to set `source: 'manual'` (default)
- [ ] Update SponsorshipPresenter to include `source` field
- [ ] Add sponsorship model validation tests (enum values)
- [ ] Add sponsorship service tests (source set correctly)
- [ ] Add sponsorship controller tests (source set on create)

**Backend - Backfill:**
- [ ] Backfill existing donations (stripe_invoice_id → csv_import, else → manual)
- [ ] Backfill existing sponsorships (inherit from related donations if csv_import, else → manual)

**Frontend - Donations:**
- [ ] Update Donation TypeScript interface with `source` field
- [ ] Display source badge in DonationList (read-only)
- [ ] Add color coding: manual (blue), csv_import (green), webhook (purple)
- [ ] Add tests for donation source display

**Frontend - Sponsorships:**
- [ ] Update Sponsorship TypeScript interface with `source` field
- [ ] Display source badge in SponsorshipList (read-only)
- [ ] Add color coding: manual (blue), csv_import (green), webhook (purple)
- [ ] Add tests for sponsorship source display

**Shared Frontend:**
- [ ] Create source utility functions (getSourceColor, getSourceLabel)
- [ ] Reuse across DonationList and SponsorshipList

**Documentation:**
- [ ] Update DonationTracking.md with source field
- [ ] Update CLAUDE.md if patterns changed
- [ ] Add migration notes

---

### Technical Approach

#### 1. Database Migration

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_source_to_donations_and_sponsorships.rb
class AddSourceToDonationsAndSponsorships < ActiveRecord::Migration[8.0]
  def change
    # Add source column to donations
    add_column :donations, :source, :string, null: false, default: 'manual'

    # Add source column to sponsorships
    add_column :sponsorships, :source, :string, null: false, default: 'manual'

    # Backfill existing records
    reversible do |dir|
      dir.up do
        # Backfill donations:
        # - Donations with stripe_invoice_id → csv_import (imported from Stripe CSV)
        # - All others → manual (created via UI)
        execute <<-SQL
          UPDATE donations
          SET source = CASE
            WHEN stripe_invoice_id IS NOT NULL THEN 'csv_import'
            ELSE 'manual'
          END
        SQL

        # Backfill sponsorships:
        # - Sponsorships with related CSV import donations → csv_import (auto-created from import)
        # - All others → manual (created via UI)
        execute <<-SQL
          UPDATE sponsorships
          SET source = CASE
            WHEN EXISTS (
              SELECT 1 FROM donations
              WHERE donations.sponsorship_id = sponsorships.id
              AND donations.source = 'csv_import'
            ) THEN 'csv_import'
            ELSE 'manual'
          END
        SQL
      end
    end
  end
end
```

#### 2. Model Updates

**Donation Model:**
```ruby
# app/models/donation.rb
class Donation < ApplicationRecord
  enum :source, {
    manual: 'manual',
    csv_import: 'csv_import',
    webhook: 'webhook'
  }, prefix: true

  validates :source, presence: true, inclusion: { in: sources.keys }
end
```

**Sponsorship Model:**
```ruby
# app/models/sponsorship.rb
class Sponsorship < ApplicationRecord
  enum :source, {
    manual: 'manual',
    csv_import: 'csv_import',
    webhook: 'webhook'
  }, prefix: true

  validates :source, presence: true, inclusion: { in: sources.keys }
end
```

#### 3. Service Updates

**StripePaymentImportService - Set source on donations AND sponsorships:**

```ruby
# app/services/stripe_payment_import_service.rb

def create_single_child_donation(donor, child)
  # Find or create sponsorship (auto-created from CSV import)
  sponsorship = Sponsorship.find_or_create_by!(
    donor: donor,
    child: child,
    monthly_amount: cents_amount
  ) do |s|
    s.source = :csv_import  # ✅ NEW: Set source on auto-created sponsorship
  end

  # Create donation linked to sponsorship
  donation = Donation.create!(
    donor: donor,
    amount: cents_amount,
    date: parsed_date,
    sponsorship: sponsorship,
    project: sponsorship.project,
    stripe_invoice_id: stripe_invoice_id,
    source: :csv_import  # ✅ NEW: Set source on donation
  )

  donation
end

def create_project_donation(donor)
  # Create donation for project (no sponsorship)
  donation = Donation.create!(
    donor: donor,
    amount: cents_amount,
    date: parsed_date,
    project: project,
    stripe_invoice_id: stripe_invoice_id,
    source: :csv_import  # ✅ NEW: Set source on donation
  )

  donation
end
```

**Note:** `find_or_create_by!` block only runs on create, so existing sponsorships won't have source updated (correct behavior - preserve original source).

#### 4. Controller Updates

**DonationsController:**
```ruby
# app/controllers/api/donations_controller.rb
def create
  donation = Donation.new(donation_params)
  donation.source = :manual  # ✅ Explicit default (DB default also sets this)
  donation.save!
  render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
end
```

**SponsorshipsController:**
```ruby
# app/controllers/api/sponsorships_controller.rb
def create
  sponsorship = Sponsorship.new(sponsorship_params)
  sponsorship.source = :manual  # ✅ Explicit default (DB default also sets this)
  sponsorship.save!
  render json: { sponsorship: SponsorshipPresenter.new(sponsorship).as_json }, status: :created
end
```

#### 5. Presenter Updates

**DonationPresenter:**
```ruby
# app/presenters/donation_presenter.rb
def as_json(options = {})
  {
    id: object.id,
    # ... existing fields ...
    source: object.source,  # ✅ NEW: Include source field
    # ... rest of fields ...
  }
end
```

**SponsorshipPresenter:**
```ruby
# app/presenters/sponsorship_presenter.rb
def as_json(options = {})
  {
    id: object.id,
    # ... existing fields ...
    source: object.source,  # ✅ NEW: Include source field
    # ... rest of fields ...
  }
end
```

#### 6. Frontend TypeScript Interfaces

```typescript
// src/types/donation.ts
export interface Donation {
  id: number;
  // ... existing fields ...
  source: 'manual' | 'csv_import' | 'webhook';  // ✅ NEW
  // ... rest of fields ...
}

// src/types/sponsorship.ts
export interface Sponsorship {
  id: number;
  // ... existing fields ...
  source: 'manual' | 'csv_import' | 'webhook';  // ✅ NEW
  // ... rest of fields ...
}
```

#### 7. Frontend Utilities & Display

**Source Utility Functions (shared):**

```typescript
// src/utils/source.ts (NEW)
export const getSourceColor = (source: string) => {
  switch (source) {
    case 'manual': return 'primary';      // Blue
    case 'csv_import': return 'success';  // Green
    case 'webhook': return 'secondary';   // Purple
    default: return 'default';
  }
};

export const getSourceLabel = (source: string) => {
  switch (source) {
    case 'manual': return 'Manual';
    case 'csv_import': return 'CSV Import';
    case 'webhook': return 'Webhook';
    default: return source;
  }
};
```

**DonationList Display:**

```tsx
// src/components/DonationList.tsx
import { Chip } from '@mui/material';
import { getSourceColor, getSourceLabel } from '../utils/source';

// In render (for each donation):
<Chip
  label={getSourceLabel(donation.source)}
  color={getSourceColor(donation.source)}
  size="small"
/>
```

**SponsorshipList Display:**

```tsx
// src/components/SponsorshipList.tsx
import { Chip } from '@mui/material';
import { getSourceColor, getSourceLabel } from '../utils/source';

// In render (for each sponsorship):
<Chip
  label={getSourceLabel(sponsorship.source)}
  color={getSourceColor(sponsorship.source)}
  size="small"
/>
```

---

### Files to Create
- Migration: `db/migrate/YYYYMMDDHHMMSS_add_source_to_donations_and_sponsorships.rb` (NEW)
- Utility: `src/utils/source.ts` (NEW - shared color/label functions)
- Test: `src/utils/source.test.ts` (NEW - utility function tests)

### Files to Modify

**Backend - Donations:**
- `app/models/donation.rb` (add enum + validation)
- `app/services/stripe_payment_import_service.rb` (set source on donations)
- `app/controllers/api/donations_controller.rb` (set source = manual)
- `app/presenters/donation_presenter.rb` (include source field)
- `spec/models/donation_spec.rb` (add enum validation tests)
- `spec/services/stripe_payment_import_service_spec.rb` (verify source set)
- `spec/requests/api/donations_spec.rb` (verify source on create)

**Backend - Sponsorships:**
- `app/models/sponsorship.rb` (add enum + validation)
- `app/services/stripe_payment_import_service.rb` (set source on auto-created sponsorships)
- `app/controllers/api/sponsorships_controller.rb` (set source = manual)
- `app/presenters/sponsorship_presenter.rb` (include source field)
- `spec/models/sponsorship_spec.rb` (add enum validation tests)
- `spec/services/stripe_payment_import_service_spec.rb` (verify source set on sponsorships)
- `spec/requests/api/sponsorships_spec.rb` (verify source on create)

**Frontend - Donations:**
- `src/types/donation.ts` (add source field to interface)
- `src/components/DonationList.tsx` (display source badge)
- `src/components/DonationList.test.tsx` (test source badge display)

**Frontend - Sponsorships:**
- `src/types/sponsorship.ts` (add source field to interface)
- `src/components/SponsorshipList.tsx` (display source badge)
- `src/components/SponsorshipList.test.tsx` (test source badge display)

**Documentation:**
- `docs/DonationTracking.md` (document source field on donations + sponsorships)
- `docs/CLAUDE.md` (update if patterns changed)

---

### Testing Strategy

**Model Tests (TDD) - Donations:**
```ruby
# spec/models/donation_spec.rb
it "validates source presence" do
  donation = build(:donation, source: nil)
  expect(donation).not_to be_valid
  expect(donation.errors[:source]).to be_present
end

it "allows valid source values" do
  %w[manual csv_import webhook].each do |source|
    donation = build(:donation, source: source)
    expect(donation).to be_valid
  end
end

it "rejects invalid source values" do
  expect {
    build(:donation, source: 'invalid')
  }.to raise_error(ArgumentError)
end
```

**Model Tests (TDD) - Sponsorships:**
```ruby
# spec/models/sponsorship_spec.rb
it "validates source presence" do
  sponsorship = build(:sponsorship, source: nil)
  expect(sponsorship).not_to be_valid
  expect(sponsorship.errors[:source]).to be_present
end

it "allows valid source values" do
  %w[manual csv_import webhook].each do |source|
    sponsorship = build(:sponsorship, source: source)
    expect(sponsorship).to be_valid
  end
end

it "rejects invalid source values" do
  expect {
    build(:sponsorship, source: 'invalid')
  }.to raise_error(ArgumentError)
end
```

**Service Tests (TDD):**
```ruby
# spec/services/stripe_payment_import_service_spec.rb
it "sets source to csv_import for imported donations" do
  result = described_class.new(valid_csv_row).import
  donation = result[:donations].first
  expect(donation.source).to eq('csv_import')
end

it "sets source to csv_import for auto-created sponsorships" do
  result = described_class.new(valid_child_csv_row).import
  donation = result[:donations].first
  expect(donation.sponsorship.source).to eq('csv_import')
end
```

**Controller Tests (TDD) - Donations:**
```ruby
# spec/requests/api/donations_spec.rb
it "sets source to manual for manually created donations" do
  post '/api/donations', params: { donation: valid_donation_params }
  donation = Donation.last
  expect(donation.source).to eq('manual')
end
```

**Controller Tests (TDD) - Sponsorships:**
```ruby
# spec/requests/api/sponsorships_spec.rb
it "sets source to manual for manually created sponsorships" do
  post '/api/sponsorships', params: { sponsorship: valid_sponsorship_params }
  sponsorship = Sponsorship.last
  expect(sponsorship.source).to eq('manual')
end
```

**Frontend Tests - Utility Functions:**
```typescript
// src/utils/source.test.ts
describe('getSourceColor', () => {
  it('returns primary for manual', () => {
    expect(getSourceColor('manual')).toBe('primary');
  });

  it('returns success for csv_import', () => {
    expect(getSourceColor('csv_import')).toBe('success');
  });

  it('returns secondary for webhook', () => {
    expect(getSourceColor('webhook')).toBe('secondary');
  });
});

describe('getSourceLabel', () => {
  it('returns formatted labels', () => {
    expect(getSourceLabel('manual')).toBe('Manual');
    expect(getSourceLabel('csv_import')).toBe('CSV Import');
    expect(getSourceLabel('webhook')).toBe('Webhook');
  });
});
```

**Frontend Tests - DonationList:**
```typescript
// src/components/DonationList.test.tsx
it('displays source badge for donations', () => {
  const donation = { ...mockDonation, source: 'csv_import' };
  render(<DonationList donations={[donation]} />);
  expect(screen.getByText('CSV Import')).toBeInTheDocument();
});

it('uses correct color for manual donation source', () => {
  const donation = { ...mockDonation, source: 'manual' };
  render(<DonationList donations={[donation]} />);
  const badge = screen.getByText('Manual');
  expect(badge).toHaveClass('MuiChip-colorPrimary'); // Blue
});
```

**Frontend Tests - SponsorshipList:**
```typescript
// src/components/SponsorshipList.test.tsx
it('displays source badge for sponsorships', () => {
  const sponsorship = { ...mockSponsorship, source: 'csv_import' };
  render(<SponsorshipList sponsorships={[sponsorship]} />);
  expect(screen.getByText('CSV Import')).toBeInTheDocument();
});

it('uses correct color for manual sponsorship source', () => {
  const sponsorship = { ...mockSponsorship, source: 'manual' };
  render(<SponsorshipList sponsorships={[sponsorship]} />);
  const badge = screen.getByText('Manual');
  expect(badge).toHaveClass('MuiChip-colorPrimary'); // Blue
});
```

---

### Backfill Strategy

**Option 1: Backfill During Migration (Recommended)**
```ruby
# In migration reversible block
execute <<-SQL
  UPDATE donations
  SET source = CASE
    WHEN stripe_invoice_id IS NOT NULL THEN 'csv_import'
    ELSE 'manual'
  END
SQL
```

**Option 2: Backfill After Migration**
```ruby
# In rails console after migration
Donation.where.not(stripe_invoice_id: nil).update_all(source: 'csv_import')
Donation.where(stripe_invoice_id: nil).update_all(source: 'manual')
```

**Recommendation:** Option 1 (backfill in migration) for atomic operation

---

### Related Tickets

**Blocks:**
- **TICKET-091** (CSV Import GUI) - **REQUIRED** - Enables smart clear database (preserve manual data)

**Related:**
- **TICKET-026** (Stripe Webhook Integration) - Will use `source: 'webhook'`
- **TICKET-110** (Import Service) - Uses source tracking for status-based imports
- **TICKET-071** (Batch Importer) - Temporary MVP, uses StripePaymentImportService (which sets source)

---

### Success Criteria

**Backend:**
- [ ] Migration runs successfully
- [ ] All existing donations backfilled with correct source
- [ ] StripePaymentImportService sets source = csv_import
- [ ] DonationsController sets source = manual
- [ ] DonationPresenter includes source field
- [ ] All backend tests pass

**Frontend:**
- [ ] Source badge displays in donation lists
- [ ] Correct colors used (blue/green/purple)
- [ ] TypeScript types updated
- [ ] All frontend tests pass

**Documentation:**
- [ ] DonationTracking.md updated
- [ ] CLAUDE.md updated if patterns changed

**Validation:**
- [ ] Can create manual donation → source = manual
- [ ] Can run CSV import → source = csv_import
- [ ] Source displays correctly in UI
- [ ] Backfilled donations have correct source

---

### Notes
- **Scope Expansion:** Now includes sponsorships (not just donations)
- **Why Sponsorships:** Needed for smart deletion in TICKET-091
  - Auto-created sponsorships from CSV may have manual donations added later
  - Cannot safely delete CSV sponsorships with manual donations attached
  - Need source tracking to preserve correct data
- **Default:** Database default is 'manual' (safest default)
- **Webhook:** Future TICKET-026 will use 'webhook' value
- **Backfill Strategy:**
  - Donations: `stripe_invoice_id IS NOT NULL` → csv_import, else → manual
  - Sponsorships: Has related csv_import donation → csv_import, else → manual
- **Display:** Read-only badge, no editing allowed
- **Colors:** Blue (manual), Green (csv_import), Purple (webhook)
- **Validation:** Enum validation at model level prevents invalid values
- **Migration:** Reversible migration for safety
- **Time Estimate:** Expanded from S (Small) to M (Medium, 3-4 hours) due to sponsorship scope

---

*Created: 2025-11-17*
*Part of audit trail and data provenance tracking*
