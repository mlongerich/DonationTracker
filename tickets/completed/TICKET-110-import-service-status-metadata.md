## [TICKET-110] Import Service with Status & Metadata Support

**Status:** ✅ Complete
**Priority:** 🔴 High - Core Functionality
**Dependencies:**
- TICKET-109 (Donation Status Infrastructure) - **REQUIRED** ✅ (must complete first)
**Created:** 2025-11-14
**Completed:** 2025-11-15
**Branch:** `feature/stripe-import-redesign`

**⭐ CODE LIFECYCLE: PERMANENT - Production Import Logic**

---

### User Story
As a developer, I want to enhance the Stripe import service to:
1. Set appropriate status on all donations (succeeded, failed, refunded, canceled, needs_attention)
2. Extract child/project mapping from Stripe metadata (primary) with parsing as fallback
3. Flag duplicate subscriptions instead of skipping them
4. Accept all import data regardless of validation issues

---

### Context

**Part of:** docs/STRIPE_IMPORT_PLAN.md - Phase 2
**Why:** Current import service:
- Skips non-succeeded payments (we need to track them)
- Only parses nickname/description (webhooks won't have this)
- Silently rejects duplicates (we need to flag them)
- Validation errors abort import (we need to accept with status)

**Webhook Alignment:** By adding metadata support NOW, TICKET-026 (webhooks) requires no service rewrite.

**See:** docs/STRIPE_IMPORT_PLAN.md sections:
- "Import Service Changes"
- "Webhook Alignment & Data Source Strategy"
- "Metadata Schema"

---

### Acceptance Criteria

**Import Service Logic:**
- [x] Determine donation status from CSV row (succeeded, failed, refunded, canceled)
- [x] Extract child_id from metadata (primary), fallback to nickname parsing
- [x] Extract project_id from metadata (primary), fallback to description parsing
- [x] Set status='succeeded' for successful payments
- [x] Set status='failed' for failed payments
- [x] Set status='needs_attention' for validation issues
- [x] Set status='needs_attention' + duplicate_subscription_detected=true for duplicate subscriptions
- [x] Populate needs_attention_reason with human-readable explanation
- [x] Include stripe_subscription_id on all donations (not just sponsorships)
- [x] Accept all CSV rows (no early returns except already-imported)
- [x] Update idempotency check to use subscription_id + child_id where available
- [x] Update import summary to show breakdown by status

**Metadata Support:**
- [x] Read `metadata.child_id` if present
- [x] Read `metadata.project_id` if present
- [x] Fallback to nickname parsing if metadata missing
- [x] Fallback to description parsing if metadata missing
- [x] Log when using fallback vs metadata

**Batch Importer Updates:**
- [x] Track counts per status (succeeded_count, failed_count, needs_attention_count)
- [x] Output summary with status breakdown
- [x] Update rake task output format

**Testing:**
- [x] RSpec: Status determination tests (all status values)
- [x] RSpec: Metadata extraction tests (child_id, project_id)
- [x] RSpec: Fallback parsing tests (backwards compatibility)
- [x] RSpec: Duplicate subscription detection tests
- [x] RSpec: Idempotency tests (subscription_id + child_id)
- [x] RSpec: Import summary tests (status breakdown)
- [x] All tests pass (90% backend coverage)

**Documentation:**
- [x] Update service comments with new behavior
- [x] Update CLAUDE.md if patterns change
- [x] Add examples of metadata format

---

### Technical Approach

#### 1. Enhanced Import Service

```ruby
# app/services/stripe_payment_import_service.rb
class StripePaymentImportService
  def import
    # Check if already imported (idempotency)
    existing = find_existing_donation
    return skip_result("Already imported (ID: #{existing.id})") if existing

    # Determine payment status from CSV
    @payment_status = determine_payment_status

    # Create donation with appropriate status
    perform_import_transaction

    success_result
  rescue StandardError => error
    error_result(error)
  end

  private

  # Determine donation status from CSV row
  def determine_payment_status
    stripe_status = @csv_row["Status"]&.downcase

    case stripe_status
    when "succeeded"
      "succeeded"
    when "failed"
      "failed"
    when "refunded"
      "refunded"
    when "canceled"
      "canceled"
    else
      "needs_attention" # Unknown status
    end
  end

  # Extract child from metadata (primary) or nickname (fallback)
  def get_child
    # Priority 1: Metadata (webhooks, future Stripe UI)
    child_id = @csv_row.dig('metadata', 'child_id')
    if child_id.present?
      child = Child.find_by(id: child_id)
      return child if child
      # Metadata present but child not found - needs attention
      @needs_attention_reason = "Metadata child_id=#{child_id} not found"
      return nil
    end

    # Priority 2: Parse nickname (current CSV exports, backwards compatibility)
    child_names = extract_child_names
    return nil if child_names.empty?

    # Multiple children - handle multi-child sponsorships
    return child_names if child_names.size > 1

    # Single child - find or create
    Child.find_or_create_by!(name: child_names.first)
  end

  # Extract project from metadata (primary) or description (fallback)
  def get_project
    # Priority 1: Metadata
    project_id = @csv_row.dig('metadata', 'project_id')
    if project_id.present?
      project = Project.find_by(id: project_id)
      return project if project
      # Metadata present but project not found - needs attention
      @needs_attention_reason = "Metadata project_id=#{project_id} not found"
      return nil
    end

    # Priority 2: Description mapping (current CSV)
    find_or_create_project
  end

  # Find existing donation for idempotency
  def find_existing_donation
    # Try subscription + child first (most reliable for sponsorships)
    subscription_id = @csv_row["Cust Subscription Data ID"]
    child = get_child
    child_id = child.is_a?(Child) ? child.id : child&.first&.id

    if subscription_id.present? && child_id.present?
      existing = Donation.find_by(
        stripe_subscription_id: subscription_id,
        child_id: child_id
      )
      return existing if existing
    end

    # Fall back to charge_id (one-time donations, less reliable)
    charge_id = @csv_row["Transaction ID"]
    if charge_id.present?
      project = get_project
      Donation.find_by(
        stripe_charge_id: charge_id,
        child_id: child_id,
        project_id: project&.id
      )
    end
  end

  # Create donation with status
  def create_donation(donor, child_or_children, project)
    @needs_attention_reason = nil # Reset per donation

    # Handle multi-child sponsorships
    if child_or_children.is_a?(Array)
      child_or_children.each do |child_name|
        child = Child.find_or_create_by!(name: child_name)
        create_single_donation(donor, child, nil)
      end
    elsif child_or_children.is_a?(Child)
      create_single_donation(donor, child_or_children, nil)
    else
      create_single_donation(donor, nil, project)
    end
  end

  def create_single_donation(donor, child, project)
    subscription_id = @csv_row["Cust Subscription Data ID"]

    # Check for duplicate subscription (same child, different subscription ID)
    duplicate_detected = false
    if subscription_id.present? && child.present?
      existing_subscriptions = Donation.where(child_id: child.id)
                                       .where.not(stripe_subscription_id: nil)
                                       .where.not(stripe_subscription_id: subscription_id)
                                       .pluck(:stripe_subscription_id)

      if existing_subscriptions.any?
        duplicate_detected = true
        @needs_attention_reason = "Duplicate subscription detected. Child #{child.name} already has subscription(s): #{existing_subscriptions.join(', ')}"
      end
    end

    # Determine final status
    final_status = @payment_status
    if duplicate_detected || @needs_attention_reason.present?
      final_status = "needs_attention"
    end

    donation = Donation.create!(
      donor: donor,
      amount: amount_in_cents,
      date: Date.parse(@csv_row["Created Formatted"]),
      child_id: child&.id,
      project_id: project&.id,
      payment_method: :stripe,
      status: final_status,
      stripe_charge_id: @csv_row["Transaction ID"],
      stripe_customer_id: @csv_row["Cust ID"],
      stripe_subscription_id: subscription_id,
      stripe_invoice_id: @csv_row["Transaction ID"],
      duplicate_subscription_detected: duplicate_detected,
      needs_attention_reason: @needs_attention_reason
    )

    @imported_donations << donation
  end
end
```

#### 2. Batch Importer Updates

```ruby
# app/services/stripe_csv_batch_importer.rb
class StripeCsvBatchImporter
  def initialize(file_path)
    @file_path = file_path
    # Track by status
    @succeeded_count = 0
    @failed_count = 0
    @needs_attention_count = 0
    @skipped_count = 0
    @errors = []
  end

  def handle_success_result(result)
    if result[:skipped]
      @skipped_count += 1
    else
      # Count by status
      result[:donations].each do |donation|
        case donation.status
        when 'succeeded'
          @succeeded_count += 1
        when 'failed'
          @failed_count += 1
        when 'needs_attention'
          @needs_attention_count += 1
        else
          # refunded, canceled
          @needs_attention_count += 1
        end
      end
    end
  end

  def build_success_result
    {
      succeeded_count: @succeeded_count,
      failed_count: @failed_count,
      needs_attention_count: @needs_attention_count,
      skipped_count: @skipped_count,
      errors: @errors
    }
  end
end
```

#### 3. Rake Task Output

```ruby
# lib/tasks/stripe_import.rake
puts "\n"
puts "=" * 80
puts "✅ Import complete!"
puts "\nSummary:"
puts "  Imported Total:     #{result[:succeeded_count] + result[:failed_count] + result[:needs_attention_count]} donations"
puts "  - Succeeded:        #{result[:succeeded_count]} donations"
puts "  - Failed:           #{result[:failed_count]} donations"
puts "  - Needs Attention:  #{result[:needs_attention_count]} donations (duplicate subscriptions, data issues)"
puts "  Skipped:            #{result[:skipped_count]} (already imported)"
puts "  Errors:             #{result[:errors].size}"
```

---

### Testing Strategy

```ruby
# spec/services/stripe_payment_import_service_spec.rb
RSpec.describe StripePaymentImportService do
  describe '#import' do
    context 'with succeeded status' do
      it 'creates donation with succeeded status' do
        csv_row = build_csv_row(status: 'succeeded')
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('succeeded')
      end
    end

    context 'with failed status' do
      it 'creates donation with failed status' do
        csv_row = build_csv_row(status: 'failed')
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('failed')
      end
    end

    context 'with refunded status' do
      it 'creates donation with refunded status' do
        csv_row = build_csv_row(status: 'refunded')
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:success]).to be true
        expect(result[:donations].first.status).to eq('refunded')
      end
    end

    context 'with metadata' do
      it 'uses metadata child_id over nickname parsing' do
        child = create(:child, id: 42, name: 'Buntita')
        csv_row = build_csv_row(
          metadata: { 'child_id' => '42' },
          nickname: 'Monthly Sponsorship Donation for OtherChild'
        )
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:donations].first.child_id).to eq(42)
      end

      it 'uses metadata project_id over description parsing' do
        project = create(:project, id: 7, title: 'Water Project')
        csv_row = build_csv_row(
          metadata: { 'project_id' => '7' },
          description: 'Some other description'
        )
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:donations].first.project_id).to eq(7)
      end

      it 'falls back to nickname parsing when metadata missing' do
        child = create(:child, name: 'Buntita')
        csv_row = build_csv_row(
          metadata: {},
          nickname: 'Monthly Sponsorship Donation for Buntita'
        )
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:donations].first.child_id).to eq(child.id)
      end
    end

    context 'with duplicate subscriptions' do
      it 'flags duplicate subscription as needs_attention' do
        child = create(:child)
        create(:donation,
               child: child,
               stripe_subscription_id: 'sub_OLD')

        csv_row = build_csv_row(
          child_name: child.name,
          subscription_id: 'sub_NEW'
        )
        service = described_class.new(csv_row)
        result = service.import

        donation = result[:donations].first
        expect(donation.status).to eq('needs_attention')
        expect(donation.duplicate_subscription_detected).to be true
        expect(donation.needs_attention_reason).to include('sub_OLD')
      end
    end

    context 'idempotency' do
      it 'skips already-imported by subscription_id + child_id' do
        child = create(:child)
        existing = create(:donation,
                          child: child,
                          stripe_subscription_id: 'sub_123')

        csv_row = build_csv_row(
          child_name: child.name,
          subscription_id: 'sub_123'
        )
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:skipped]).to be true
        expect(result[:reason]).to include(existing.id.to_s)
      end

      it 'skips already-imported by charge_id' do
        project = create(:project)
        existing = create(:donation,
                          project: project,
                          stripe_charge_id: 'ch_123')

        csv_row = build_csv_row(
          transaction_id: 'ch_123',
          project_description: project.title
        )
        service = described_class.new(csv_row)
        result = service.import

        expect(result[:skipped]).to be true
      end
    end
  end
end
```

---

### Files to Modify
- `app/services/stripe_payment_import_service.rb` (replace import logic entirely)
- `app/services/stripe_csv_batch_importer.rb` (update counters and output)
- `lib/tasks/stripe_import.rake` (update summary output)
- `spec/services/stripe_payment_import_service_spec.rb` (comprehensive status/metadata tests)
- `spec/services/stripe_csv_batch_importer_spec.rb` (update counter tests)

### Files to Create
- None (all modifications to existing files)

### Files NOT to Touch
- Controllers (no API changes yet)
- Presenters (status automatically included in JSON)
- Frontend (TICKET-111 builds new UI)
- Models (TICKET-109 already added status infrastructure)

---

### Related Tickets

**Depends On:**
- **TICKET-109** (Donation Status Infrastructure) - **REQUIRED** - Must have status field before importing with status

**This Redesign:**
- **TICKET-111**: Pending Review UI (will query donations by status)
- **TICKET-112**: Validation & Merge (will test full import workflow)
- **TICKET-113**: Cleanup Old System (removes old code after merge)

**Replaces:**
- TICKET-071 (CSV Import Logic) - Enhances with status and metadata
- TICKET-076 (Failed Payments Tracking) - Now part of donations table

**Enables:**
- **TICKET-026** (Stripe Webhook Integration) - Metadata strategy aligns webhooks with CSV imports (ZERO rework)

**See:**
- docs/STRIPE_IMPORT_PLAN.md - Full metadata strategy and rationale
- TICKET-026 - Webhook transform function will use same metadata format

---

### Success Criteria

**Definition of Done:**
- [x] All CSV rows import successfully (no early returns)
- [x] Donations created with correct status (succeeded, failed, refunded, canceled, needs_attention)
- [x] Metadata extraction works (child_id, project_id)
- [x] Fallback parsing works (backwards compatible with current CSV)
- [x] Duplicate subscriptions flagged (not skipped)
- [x] Idempotency works (subscription_id + child_id)
- [x] Import summary shows status breakdown
- [x] All RSpec tests pass (90% coverage)
- [x] Can re-run import safely (no duplicates created)

**Ready for Next Ticket:**
- [x] TICKET-111 can query donations by status for admin UI
- [x] Can import fresh CSV and see status distribution

---

### Metadata Schema Reference

```typescript
// CSV row metadata structure
{
  // Subscription metadata (for child sponsorships)
  child_id: string,           // e.g., "42"
  source: 'donation_tracker',

  // Charge/Invoice metadata (for projects)
  project_id: string,         // e.g., "7"
  donation_type: 'general' | 'campaign' | 'sponsorship',
  source: 'donation_tracker',

  // Future enhancements
  campaign_id: string,        // TICKET-027
  memorial_name: string       // Future feature
}
```

**Current CSV:** Metadata is empty (use fallback parsing)
**Future Stripe UI:** Will populate metadata
**Webhooks:** Metadata included in payload (no API calls needed)

---

### Notes
- **Database:** Can drop and recreate freely (pre-production)
- **Breaking Change:** Yes - replaces import service logic entirely
- **No Feature Flags:** Branch-based workflow (safe to rewrite on branch)
- **Testing:** Follow strict TDD - write tests first, one at a time
- **Commit:** Commit to `feature/stripe-import-redesign` branch when complete
- **Backwards Compatible:** Parsing fallback ensures current CSV imports work unchanged

---

*Created: 2025-11-14*
*Part of docs/STRIPE_IMPORT_PLAN.md Phase 2 (Import Service)*
