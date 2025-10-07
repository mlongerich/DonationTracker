## [TICKET-012] Stripe Webhook Integration

**Status:** 📋 Planned
**Priority:** 🟢 Low
**Dependencies:** TICKET-006 (Donation model), TICKET-011 (Recurring logic)

### User Story
As the system, I want to automatically update donation records when Stripe payments occur so that donation data stays in sync with payment processor.

### Acceptance Criteria
- [ ] Backend: POST /webhooks/stripe endpoint (unauthenticated - webhook only)
- [ ] Backend: Stripe webhook signature verification
- [ ] Backend: Handle payment_intent.succeeded event
- [ ] Backend: Handle invoice.payment_succeeded event (subscriptions)
- [ ] Backend: Handle customer.subscription.deleted event
- [ ] Backend: Find donation by stripe_payment_intent_id or customer_id
- [ ] Backend: Update last_received_date, calculate new expected_next_date
- [ ] Backend: Reset missed_payments_count and status on successful payment
- [ ] Backend: Add stripe fields to Donation (stripe_payment_intent_id, stripe_customer_id, stripe_subscription_id)
- [ ] RSpec tests with Stripe webhook fixtures
- [ ] Manual testing with Stripe CLI webhook forwarding

### Technical Notes
- **TDD approach**: Red-Green-Refactor cycle followed for all tests
- **Stripe gem**: Already in Gemfile
- **Webhook signing**: Use STRIPE_WEBHOOK_SECRET env var
- **Signature verification**: `Stripe::Webhook.construct_event(payload, sig_header, secret)`
- **Event types**: payment_intent.succeeded, invoice.payment_succeeded, customer.subscription.deleted
- **Idempotency**: Check if event already processed (store stripe_event_id)
- **Error handling**: Return 200 even on errors (Stripe will retry)
- **Testing**: Use `stripe trigger` CLI command

### Files Changed
- Backend: `db/migrate/..._add_stripe_fields_to_donations.rb` (new)
- Backend: `app/controllers/webhooks/stripe_controller.rb` (new)
- Backend: `config/routes.rb` (add webhook route)
- Backend: `app/services/stripe_webhook_handler.rb` (new)
- Backend: `spec/requests/webhooks/stripe_spec.rb` (new)

### Related Commits
- (To be added during commit)
