## [TICKET-026] Stripe Webhook Integration (Real-time Sync)

**Status:** 🟢 Ready to Implement
**Priority:** 🟡 Medium (Production Enhancement)
**Dependencies:**
- TICKET-070 (Stripe CSV Import Foundation) - **COMPLETE** ✅
- TICKET-112 (Stripe Import Redesign - donation status & metadata) - **COMPLETE** ✅
**Created:** 2025-11-01
**Updated:** 2025-11-17

**⭐ CODE LIFECYCLE: PERMANENT - Production Real-Time Sync**

**This ticket creates PERMANENT production infrastructure.**
- Webhook endpoint runs forever (real-time donation sync)
- **REUSES** `StripePaymentImportService` from TICKET-112 (no duplicate logic)
- Complements CSV import for ongoing donation tracking
- Uses TICKET-112's idempotency strategy (stripe_invoice_id)

**KEY INSIGHT:** Stripe webhooks return same data structure as CSV
- CSV has 348 columns (all Stripe API fields flattened)
- Webhooks return same Stripe objects as structured JSON
- Transform webhook → CSV hash → reuse existing service
- **Zero code duplication** - 100% service reuse

**TICKET-112 REDESIGN ALIGNMENT:**
- ✅ Metadata-first extraction (child_id, project_id from metadata)
- ✅ Status tracking (succeeded, failed, refunded, canceled, needs_attention)
- ✅ Idempotency via stripe_invoice_id (StripeInvoice model)
- ✅ Multi-child sponsorship support (same invoice, multiple children)
- ✅ Duplicate detection (same child, different subscription_id)

### User Story
As an admin, I want Stripe webhook integration so that new donations are automatically created in the system when customers donate through Stripe's hosted payment pages.

### Scope Note
**CSV import is complete via TICKET-070, TICKET-071, TICKET-112.**
This ticket adds webhook integration for **real-time** donation sync.

**Why Now:** TICKET-112 redesign provides metadata-first extraction and robust idempotency.
The webhook integration is now straightforward since `StripePaymentImportService` handles all edge cases:
- Status determination (succeeded/failed/refunded/canceled/needs_attention)
- Metadata extraction (child_id, project_id)
- Duplicate subscription detection
- Multi-child sponsorship handling
- Same-invoice duplicate prevention

### Acceptance Criteria

**Webhook Infrastructure (PERMANENT):**
- [ ] Backend: Webhook endpoint POST /webhooks/stripe with signature verification
- [ ] Backend: Add stripe gem to Gemfile (`gem 'stripe', '~> 10.0'`)
- [ ] Backend: Store webhook signing secret in Rails credentials
- [ ] Backend: Handle webhook event: `charge.succeeded` (one-time donations)
- [ ] Backend: Handle webhook event: `invoice.payment_succeeded` (recurring subscriptions)
- [ ] Backend: Handle webhook event: `customer.subscription.deleted` (subscription cancellations)

**Service Reuse (NO DUPLICATION):**
- [ ] Backend: **Reuse `StripePaymentImportService` from TICKET-112** for all processing
- [ ] Backend: Transform webhook payload → CSV hash format (adapter pattern)
- [ ] Backend: Idempotency via stripe_invoice_id (StripeInvoice unique index)
- [ ] Backend: Include metadata hash in CSV format (metadata.child_id, metadata.project_id)
- [ ] Backend: Document in service comments that it handles both CSV AND webhooks

**Testing & Documentation:**
- [ ] Backend: RSpec tests for webhook controller (8+ tests)
- [ ] Backend: RSpec tests for signature verification
- [ ] Backend: RSpec tests for event type handling
- [ ] Backend: RSpec tests for payload transformation
- [ ] All tests pass (90% backend coverage)
- [ ] Update CLAUDE.md with webhook integration pattern

### Technical Approach

#### 1. Add Stripe Gem

```ruby
# Gemfile
gem 'stripe', '~> 10.0'
```

#### 2. Store Webhook Secret

```bash
# Store in Rails credentials
rails credentials:edit

# Add:
stripe:
  webhook_secret: whsec_YOUR_WEBHOOK_SECRET_FROM_STRIPE_DASHBOARD
```

#### 3. Webhook Controller

```ruby
# config/routes.rb
post '/webhooks/stripe', to: 'webhooks/stripe#create'

# app/controllers/webhooks/stripe_controller.rb
#
# Handles Stripe webhook events for real-time donation sync.
#
# Supported events:
# - charge.succeeded (one-time donations)
# - invoice.payment_succeeded (recurring subscription payments)
# - customer.subscription.deleted (subscription cancellations)
#
# Security:
# - Verifies webhook signature via Stripe::Webhook.construct_event
# - Returns 400 for invalid signatures
#
class Webhooks::StripeController < ApplicationController
  skip_before_action :verify_authenticity_token

  def create
    payload = request.body.read
    sig_header = request.env['HTTP_STRIPE_SIGNATURE']

    # Verify webhook signature
    event = Stripe::Webhook.construct_event(
      payload,
      sig_header,
      Rails.application.credentials.stripe[:webhook_secret]
    )

    # Handle event types
    case event.type
    when 'charge.succeeded'
      handle_charge_succeeded(event.data.object)
    when 'invoice.payment_succeeded'
      handle_invoice_payment_succeeded(event.data.object)
    when 'customer.subscription.deleted'
      handle_subscription_deleted(event.data.object)
    else
      Rails.logger.info("Unhandled Stripe webhook event: #{event.type}")
    end

    render json: { status: 'success' }, status: 200
  rescue Stripe::SignatureVerificationError => error
    Rails.logger.error("Stripe webhook signature verification failed: #{error.message}")
    render json: { error: 'Invalid signature' }, status: 400
  rescue StandardError => error
    Rails.logger.error("Stripe webhook processing error: #{error.message}")
    render json: { error: 'Processing error' }, status: 500
  end

  private

  # Handle one-time charge (non-subscription)
  def handle_charge_succeeded(charge)
    # Transform webhook payload to CSV-compatible format
    csv_row_hash = transform_charge_to_csv_format(charge)

    # Reuse existing import service from TICKET-112
    service = StripePaymentImportService.new(csv_row_hash)
    result = service.import

    log_import_result(result, 'charge.succeeded', charge.id)
  end

  # Handle recurring subscription payment
  def handle_invoice_payment_succeeded(invoice)
    # Get charge from invoice
    charge = Stripe::Charge.retrieve(invoice.charge) if invoice.charge

    return unless charge

    # Fetch subscription for metadata
    subscription = Stripe::Subscription.retrieve(invoice.subscription) if invoice.subscription

    csv_row_hash = transform_charge_to_csv_format(charge, invoice, subscription)

    service = StripePaymentImportService.new(csv_row_hash)
    result = service.import

    log_import_result(result, 'invoice.payment_succeeded', invoice.id)
  end

  # Handle subscription cancellation
  def handle_subscription_deleted(subscription)
    # Find sponsorships by stripe_subscription_id via donations
    donations = Donation.where(stripe_subscription_id: subscription.id)
                        .where.not(sponsorship_id: nil)

    sponsorships_ended = 0
    donations.group_by(&:sponsorship_id).each do |sponsorship_id, _|
      sponsorship = Sponsorship.find_by(id: sponsorship_id)
      next unless sponsorship&.active?

      sponsorship.update(end_date: Date.today, status: :inactive)
      sponsorships_ended += 1
      Rails.logger.info("Ended sponsorship #{sponsorship_id} due to Stripe subscription #{subscription.id} cancellation")
    end

    Rails.logger.info("Ended #{sponsorships_ended} sponsorship(s) for subscription #{subscription.id}")
  end

  # Transform Stripe charge object to CSV row hash format
  # This allows 100% REUSE of StripePaymentImportService from TICKET-112
  #
  # Why this works:
  # - CSV export contains same Stripe API fields (348 columns!)
  # - Webhooks return same Stripe objects (charge, customer, subscription, invoice)
  # - Transform webhook JSON → CSV hash format → reuse existing service
  # - ZERO code duplication for donation processing logic
  #
  # TICKET-112 REDESIGN ALIGNMENT:
  # - Metadata-first extraction (child_id, project_id from metadata)
  # - Status tracking (charge.status → donation.status)
  # - Idempotency (stripe_invoice_id via StripeInvoice model)
  #
  # @param charge [Stripe::Charge] The Stripe charge object
  # @param invoice [Stripe::Invoice] Optional invoice for subscription payments
  # @param subscription [Stripe::Subscription] Optional subscription for metadata
  # @return [Hash] CSV-compatible hash for StripePaymentImportService
  def transform_charge_to_csv_format(charge, invoice = nil, subscription = nil)
    {
      'Amount' => (charge.amount / 100.0).to_s, # Convert cents to dollars (CSV format)
      'Billing Details Name' => charge.billing_details&.name,
      'Cust Email' => charge.billing_details&.email || charge.receipt_email,
      'Created Formatted' => Time.at(charge.created).utc.strftime('%Y-%m-%d %H:%M:%S +0000'),
      'Description' => charge.description,
      'Transaction ID' => charge.id, # stripe_charge_id
      'Cust ID' => charge.customer,
      'Status' => charge.status, # succeeded, failed, etc.
      'Invoice' => invoice&.id,
      'Cust Subscription Data ID' => invoice&.subscription || subscription&.id,
      'Cust Subscription Data Plan Nickname' => subscription&.plan&.nickname,

      # CRITICAL: Include metadata for child/project mapping (TICKET-112 metadata-first strategy)
      # Metadata is PRIMARY source, nickname/description are FALLBACK
      # Merge charge metadata + invoice metadata + subscription metadata
      'metadata' => charge.metadata.to_h
                          .merge(invoice&.metadata&.to_h || {})
                          .merge(subscription&.metadata&.to_h || {})
      # StripePaymentImportService from TICKET-112 handles the rest!
    }
  end

  # Log import result for debugging and monitoring
  def log_import_result(result, event_type, stripe_id)
    if result[:success] && !result[:skipped]
      Rails.logger.info("Webhook #{event_type} (#{stripe_id}): Created #{result[:donations].size} donation(s)")
    elsif result[:skipped]
      Rails.logger.info("Webhook #{event_type} (#{stripe_id}): Skipped - #{result[:reason]}")
    else
      Rails.logger.error("Webhook #{event_type} (#{stripe_id}): Failed - #{result[:error]}")
    end
  end
end
```

### Webhook Event Flow

**charge.succeeded (One-time):**
```
Stripe → Webhook → Transform to CSV format → StripePaymentImportService → Donation created
```

**invoice.payment_succeeded (Recurring):**
```
Stripe → Webhook → Fetch charge → Transform → StripePaymentImportService → Donation + Sponsorship created
```

**customer.subscription.deleted:**
```
Stripe → Webhook → Find sponsorship by subscription_id → Set end_date → Sponsorship ended
```

### Idempotency (TICKET-112 Redesign Strategy)

**StripeInvoice Model (Primary Idempotency):**
- `stripe_invoice_id` has unique index in StripeInvoice model
- Service calls `create_stripe_invoice` which uses `find_or_create_by!`
- Multiple webhook deliveries = single StripeInvoice record
- Donations link to invoice via `stripe_invoice_id` (not unique, allows multi-child)

**Multi-Child Sponsorship Handling:**
- Same invoice can have multiple donations (one per child)
- Idempotency: subscription_id + child_id combination
- Service checks `donation_exists_for_invoice_and_child?` to prevent same-invoice duplicates
- If same child appears twice in same invoice → flagged as `needs_attention`

**Why This Works:**
- Webhooks deliver same `invoice.id` on replay
- `StripeInvoice.find_or_create_by!(stripe_invoice_id: invoice.id)` prevents duplicate invoices
- Donation creation checks for existing invoice + child combination
- Safe for webhook replays and CSV re-imports

### Testing Strategy

```ruby
# spec/requests/webhooks/stripe_spec.rb
RSpec.describe 'Webhooks::Stripe' do
  describe 'POST /webhooks/stripe' do
    let(:webhook_secret) { 'whsec_test_secret' }
    let(:payload) { { type: 'charge.succeeded', data: { object: charge_data } }.to_json }

    before do
      allow(Rails.application.credentials).to receive(:stripe).and_return({ webhook_secret: webhook_secret })
    end

    context 'with valid signature' do
      it 'processes charge.succeeded event'
      it 'processes invoice.payment_succeeded event'
      it 'processes customer.subscription.deleted event'
      it 'returns 200 status'
    end

    context 'with invalid signature' do
      it 'returns 400 status'
      it 'logs signature verification failure'
    end

    context 'with unknown event type' do
      it 'logs unhandled event'
      it 'returns 200 status (acknowledge receipt)'
    end

    context 'when processing fails' do
      it 'returns 500 status'
      it 'logs processing error'
    end
  end
end
```

### Files to Create
- `app/controllers/webhooks/stripe_controller.rb`
- `spec/requests/webhooks/stripe_spec.rb`

### Files to Modify
- `Gemfile` (add stripe gem)
- `config/routes.rb` (add webhook route)
- `config/credentials.yml.enc` (add webhook secret)
- `CLAUDE.md` (add webhook integration pattern)

### Related Tickets

**DEPENDS ON (REQUIRED):**
- **TICKET-112: Stripe Import Redesign** (✅ COMPLETE - provides enhanced StripePaymentImportService)
  - Includes TICKET-070 (foundation), TICKET-109 (status), TICKET-110 (metadata), TICKET-111 (UI)

**RELATED:**
- TICKET-071: Stripe CSV Batch Import Task (🗑️ TEMPORARY - delete after initial import)
- TICKET-072: Import Error Recovery UI (🗑️ OPTIONAL - CSV error handling)
- TICKET-113: Cleanup Old System (🧹 HOUSEKEEPING - remove failed_stripe_payments)
- TICKET-027: Stripe Description Mapping Management (FUTURE - admin mapping UI)

### Code Lifecycle & Reusability

**PERMANENT CODE (Production Infrastructure):**
- `Webhooks::StripeController` - Webhook endpoint
- `transform_charge_to_csv_format` - Adapter for service reuse
- Webhook route in `routes.rb`
- All tests for webhook controller

**REUSED FROM TICKET-112 (Zero Duplication):**
- `StripePaymentImportService` - Core donation processing logic
- **Status determination** (succeeded, failed, refunded, canceled, needs_attention)
- **Metadata-first extraction** (child_id, project_id from metadata)
- Pattern matching (sponsorships, general, campaigns) as fallback
- Multi-child sponsorship handling (array of children from metadata or parsing)
- Donor deduplication (find_or_create_by_email_or_stripe_customer)
- Child/Project/Sponsorship auto-creation
- Amount conversion (cents ↔ dollars)
- **Idempotency** (stripe_invoice_id via StripeInvoice model)
- **Duplicate subscription detection** (same child, different subscription_id)
- **Same-invoice duplicate prevention** (same child twice in same invoice)

**WHY NO CODE DUPLICATION:**
```ruby
# CSV Import (TICKET-071)
csv_row_hash = CSV.parse_line(row)
StripePaymentImportService.new(csv_row_hash).import

# Webhook (THIS TICKET)
csv_row_hash = transform_charge_to_csv_format(webhook_charge)
StripePaymentImportService.new(csv_row_hash).import
# ↑ Same service, same logic, different input sources!
```

### Stripe Dashboard Configuration

After implementing webhook endpoint:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourapp.com/webhooks/stripe`
3. Select events to send:
   - `charge.succeeded`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy webhook signing secret to Rails credentials

### Notes
- **This is PERMANENT production infrastructure** (runs forever)
- CSV import (TICKET-071) is **one-time throwaway code** (delete after initial import)
- **100% service reuse** from TICKET-112 (no duplicate logic)
- Requires Stripe gem and webhook secret configuration
- Handles subscription cancellations by ending sponsorships
- **TICKET-112 redesign makes webhook implementation straightforward:**
  - Metadata-first extraction (webhooks naturally include metadata)
  - Status tracking (webhooks include charge.status)
  - Idempotency (StripeInvoice model prevents duplicate imports)
  - Duplicate detection (handles edge cases like same child in multiple subscriptions)
- Future: TICKET-027 will add admin UI for description mapping rules
- **After CSV import completes, delete TICKET-071 code but KEEP this!**
