## [TICKET-118] Add Source Tracking to Donations

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Size:** S (Small)
**Dependencies:**
- TICKET-112 (Validation & Merge) - **REQUIRED** (merge to master first)
**Created:** 2025-11-17
**Branch:** TBD (create after TICKET-112 merged)

**⭐ CODE LIFECYCLE: PERMANENT - Audit Trail Feature**

---

### User Story
As an admin, I want to know whether each donation was added via CSV import, webhook, or manual entry so that I can trace data provenance, audit imports, and troubleshoot data issues.

---

### Context

**Why:** Currently there's no way to distinguish donations created by:
1. CSV import (historical one-time bulk import)
2. Webhook (future real-time Stripe sync)
3. Manual entry (admin creating donations via UI)

**Use Cases:**
- **Audit Trail:** "Where did this donation come from?"
- **Troubleshooting:** "Was this imported or manually entered?"
- **Data Quality:** "How many donations came from CSV vs webhooks?"
- **Import Validation:** "Which donations need to be re-imported if CSV fails?"

**Scope:** Add `source` enum field to donations table, update all creation paths, display in UI

---

### Acceptance Criteria

**Backend:**
- [ ] Add migration: `source` enum column to donations table (manual, csv_import, webhook)
- [ ] Update Donation model with enum validation
- [ ] Update StripePaymentImportService to set `source: 'csv_import'`
- [ ] Update DonationsController to set `source: 'manual'` (default)
- [ ] Update DonationPresenter to include `source` field
- [ ] Add model validation tests (enum values)
- [ ] Add service tests (source set correctly)
- [ ] Add controller tests (source set on create)

**Frontend:**
- [ ] Update Donation TypeScript interface with `source` field
- [ ] Display source badge in DonationList (read-only)
- [ ] Display source in donation details/cards
- [ ] Add color coding: manual (blue), csv_import (green), webhook (purple)
- [ ] Add tests for source display

**Documentation:**
- [ ] Update DonationTracking.md with source field
- [ ] Update CLAUDE.md if patterns changed
- [ ] Add migration notes

---

### Technical Approach

#### 1. Database Migration

```ruby
# db/migrate/YYYYMMDDHHMMSS_add_source_to_donations.rb
class AddSourceToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :source, :string, null: false, default: 'manual'

    # Backfill existing donations (all manual since no CSV import yet)
    reversible do |dir|
      dir.up do
        # If running AFTER CSV import on master, backfill:
        # - Donations with stripe_invoice_id → csv_import
        # - All others → manual
        execute <<-SQL
          UPDATE donations
          SET source = CASE
            WHEN stripe_invoice_id IS NOT NULL THEN 'csv_import'
            ELSE 'manual'
          END
        SQL
      end
    end
  end
end
```

#### 2. Model Update

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

#### 3. Service Update

```ruby
# app/services/stripe_payment_import_service.rb
def create_single_child_donation(donor, child)
  # ... existing code ...
  donation = Donation.create!(
    # ... existing fields ...
    source: :csv_import  # ✅ New field
  )
end

def create_project_donation(donor)
  # ... existing code ...
  donation = Donation.create!(
    # ... existing fields ...
    source: :csv_import  # ✅ New field
  )
end
```

#### 4. Controller Update

```ruby
# app/controllers/api/donations_controller.rb
def create
  donation = Donation.new(donation_params)
  donation.source = :manual  # ✅ Explicit default (already set by DB default)
  donation.save!
  render json: { donation: DonationPresenter.new(donation).as_json }, status: :created
end
```

#### 5. Presenter Update

```ruby
# app/presenters/donation_presenter.rb
def as_json(options = {})
  {
    id: object.id,
    # ... existing fields ...
    source: object.source,  # ✅ New field
    # ... rest of fields ...
  }
end
```

#### 6. Frontend TypeScript Interface

```typescript
// src/types/donation.ts
export interface Donation {
  id: number;
  // ... existing fields ...
  source: 'manual' | 'csv_import' | 'webhook';  // ✅ New field
  // ... rest of fields ...
}
```

#### 7. Frontend Display

```tsx
// src/components/DonationList.tsx
import { Chip } from '@mui/material';

const getSourceColor = (source: string) => {
  switch (source) {
    case 'manual': return 'primary';      // Blue
    case 'csv_import': return 'success';  // Green
    case 'webhook': return 'secondary';   // Purple
    default: return 'default';
  }
};

const getSourceLabel = (source: string) => {
  switch (source) {
    case 'manual': return 'Manual';
    case 'csv_import': return 'CSV Import';
    case 'webhook': return 'Webhook';
    default: return source;
  }
};

// In render:
<Chip
  label={getSourceLabel(donation.source)}
  color={getSourceColor(donation.source)}
  size="small"
/>
```

---

### Files to Create
- Migration: `db/migrate/YYYYMMDDHHMMSS_add_source_to_donations.rb`
- Test: Update `spec/models/donation_spec.rb` (enum validation)
- Test: Update `spec/services/stripe_payment_import_service_spec.rb` (source = csv_import)
- Test: Update `spec/controllers/api/donations_controller_spec.rb` (source = manual)

### Files to Modify
- `app/models/donation.rb` (add enum)
- `app/services/stripe_payment_import_service.rb` (set source)
- `app/controllers/api/donations_controller.rb` (set source)
- `app/presenters/donation_presenter.rb` (include source)
- `src/types/donation.ts` (add source field)
- `src/components/DonationList.tsx` (display source badge)
- `DonationTracking.md` (document source field)

---

### Testing Strategy

**Model Tests (TDD):**
```ruby
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

**Service Tests (TDD):**
```ruby
it "sets source to csv_import for imported donations" do
  result = described_class.new(valid_csv_row).import
  donation = result[:donations].first
  expect(donation.source).to eq('csv_import')
end
```

**Controller Tests (TDD):**
```ruby
it "sets source to manual for manually created donations" do
  post :create, params: { donation: valid_donation_params }
  donation = Donation.last
  expect(donation.source).to eq('manual')
end
```

**Frontend Tests:**
```typescript
it('displays source badge', () => {
  const donation = { ...mockDonation, source: 'csv_import' };
  render(<DonationList donations={[donation]} />);
  expect(screen.getByText('CSV Import')).toBeInTheDocument();
});

it('uses correct color for manual source', () => {
  const donation = { ...mockDonation, source: 'manual' };
  render(<DonationList donations={[donation]} />);
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

**Depends On:**
- **TICKET-112** (Validation & Merge) - **REQUIRED** (merge to master first)

**Related:**
- **TICKET-026** (Stripe Webhook Integration) - Will use `source: 'webhook'`
- **TICKET-110** (Import Service) - Adds source to CSV imports
- **TICKET-071** (Batch Importer) - Temporary code, won't set source (deleted after CSV import)

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
- **Default:** Database default is 'manual' (safest default)
- **Webhook:** Future TICKET-026 will use 'webhook' value
- **Backfill:** Backfill based on `stripe_invoice_id` presence (not perfect but good enough)
- **Display:** Read-only badge, no editing allowed
- **Colors:** Blue (manual), Green (csv_import), Purple (webhook)
- **Validation:** Enum validation at model level prevents invalid values
- **Migration:** Reversible migration for safety

---

*Created: 2025-11-17*
*Part of audit trail and data provenance tracking*
