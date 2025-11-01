## [TICKET-026] Stripe Webhook Integration (Real-time Sync)

**Status:** 📋 Planned
**Priority:** 🟡 Medium
**Dependencies:** TICKET-070 (Stripe CSV Import Foundation) - **REQUIRED**
**Created:** 2025-11-01 (Updated)

**⭐ CODE LIFECYCLE: PERMANENT - Long-Term Production Solution**

**This ticket creates PERMANENT production infrastructure.**
- Webhook endpoint runs forever (real-time donation sync)
- **REUSES** `StripePaymentImportService` from TICKET-070 (no duplicate logic)
- Replaces CSV import as the ongoing donation source

**KEY INSIGHT:** Stripe CSV export = flattened webhook payload
- CSV has 348 columns (all Stripe API fields)
- Webhooks return same data as JSON objects
- Transform webhook → CSV hash → reuse TICKET-070 service
- **Zero code duplication**

### User Story
As an admin, I want Stripe webhook integration so that new donations are automatically created in the system when customers donate through Stripe's hosted payment pages.

### Scope Note
**CSV import has been moved to TICKET-070, TICKET-071, TICKET-072.**
This ticket ONLY focuses on webhook integration for real-time donation sync.

**This is the LONG-TERM solution.** CSV import (TICKET-071) is one-time throwaway code.

### Acceptance Criteria

**Webhook Infrastructure (PERMANENT):**
- [ ] Backend: Webhook endpoint POST /webhooks/stripe with signature verification
- [ ] Backend: Add stripe gem to Gemfile (`gem 'stripe', '~> 10.0'`)
- [ ] Backend: Store webhook signing secret in Rails credentials
- [ ] Backend: Handle webhook event: `charge.succeeded` (one-time donations)
- [ ] Backend: Handle webhook event: `invoice.payment_succeeded` (recurring subscriptions)
- [ ] Backend: Handle webhook event: `customer.subscription.deleted` (subscription cancellations)

**Service Reuse (NO DUPLICATION):**
- [ ] Backend: **Reuse `StripePaymentImportService` from TICKET-070** for all processing
- [ ] Backend: Transform webhook payload → CSV hash format (adapter pattern)
- [ ] Backend: Verify idempotency via stripe_charge_id (skip duplicates)
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

    # Reuse existing import service from TICKET-070
    service = StripePaymentImportService.new(csv_row_hash)
    service.import
  end

  # Handle recurring subscription payment
  def handle_invoice_payment_succeeded(invoice)
    # Get charge from invoice
    charge = Stripe::Charge.retrieve(invoice.charge) if invoice.charge

    return unless charge

    csv_row_hash = transform_charge_to_csv_format(charge)
    csv_row_hash['Cust Subscription Data ID'] = invoice.subscription

    service = StripePaymentImportService.new(csv_row_hash)
    service.import
  end

  # Handle subscription cancellation
  def handle_subscription_deleted(subscription)
    # Find sponsorship by stripe_subscription_id
    donations = Donation.where(stripe_subscription_id: subscription.id)

    donations.each do |donation|
      next unless donation.sponsorship

      # End the sponsorship
      donation.sponsorship.update(end_date: Date.today)
      Rails.logger.info("Ended sponsorship #{donation.sponsorship.id} due to Stripe subscription cancellation")
    end
  end

  # Transform Stripe charge object to CSV row hash format
  # This allows 100% REUSE of StripePaymentImportService from TICKET-070
  #
  # Why this works:
  # - CSV export contains same Stripe API fields (348 columns!)
  # - Webhooks return same Stripe objects (charge, customer, subscription)
  # - Transform webhook JSON → CSV hash format → reuse existing service
  # - ZERO code duplication for donation processing logic
  def transform_charge_to_csv_format(charge)
    {
      'Amount' => (charge.amount / 100.0).to_s, # Convert cents to dollars (CSV format)
      'Billing Details Name' => charge.billing_details&.name,
      'Cust Email' => charge.billing_details&.email || charge.receipt_email,
      'Created Formatted' => Time.at(charge.created).utc.strftime('%Y-%m-%d %H:%M:%S +0000'),
      'Description' => charge.description,
      'Transaction ID' => charge.id,
      'Cust ID' => charge.customer,
      'Status' => charge.status
      # StripePaymentImportService from TICKET-070 handles the rest!
    }
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

### Idempotency
- Webhook replays are safe (stripe_charge_id unique index prevents duplicates)
- `StripePaymentImportService` checks `already_imported?` before processing
- Multiple webhook deliveries = single donation created

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
- **TICKET-070: Stripe CSV Import Foundation** (⭐ PERMANENT - provides StripePaymentImportService)

**RELATED:**
- TICKET-071: Stripe CSV Batch Import Task (🗑️ TEMPORARY - one-time historical import)
- TICKET-072: Import Error Recovery UI (🗑️ OPTIONAL - CSV error handling)
- TICKET-027: Stripe Description Mapping Management (FUTURE - admin mapping UI)

### Code Lifecycle & Reusability

**PERMANENT CODE (Production Infrastructure):**
- `Webhooks::StripeController` - Webhook endpoint
- `transform_charge_to_csv_format` - Adapter for service reuse
- Webhook route in `routes.rb`
- All tests for webhook controller

**REUSED FROM TICKET-070 (Zero Duplication):**
- `StripePaymentImportService` - Core donation processing logic
- Pattern matching (sponsorships, general, campaigns)
- Multi-child sponsorship handling
- Donor deduplication
- Child/Project/Sponsorship auto-creation
- Amount conversion
- Idempotency (stripe_charge_id)

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
- **This is the PERMANENT production solution** (runs forever)
- CSV import (TICKET-071) is **one-time throwaway code**
- **100% service reuse** from TICKET-070 (no duplicate logic)
- Requires Stripe gem and webhook secret configuration
- Handles subscription cancellations by ending sponsorships
- Future: TICKET-027 will add admin UI for description mapping rules
- **After CSV import completes, delete TICKET-071 code but KEEP this!**
