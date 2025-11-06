# frozen_string_literal: true

# Represents a Stripe invoice for tracking multi-donation sponsorships.
#
# A Stripe invoice must have:
# - stripe_invoice_id (unique identifier, primary key for relationships)
# - stripe_charge_id (transaction ID)
# - total_amount_cents (invoice total in cents)
# - invoice_date (date of invoice)
# - Optional stripe_customer_id and stripe_subscription_id
#
# Purpose: Allows multiple donations to share the same Stripe invoice ID
# for multi-child sponsorships (one invoice, multiple children).
#
# @example Create a Stripe invoice
#   StripeInvoice.create!(
#     stripe_invoice_id: "in_123",
#     stripe_charge_id: "ch_456",
#     total_amount_cents: 10000,
#     invoice_date: Date.today
#   )
#
# @see Donation for donation relationship
# @see StripePaymentImportService for import logic
# @see TICKET-070 for multi-child sponsorship implementation
class StripeInvoice < ApplicationRecord
  has_many :donations, foreign_key: :stripe_invoice_id, primary_key: :stripe_invoice_id

  validates :stripe_invoice_id, :stripe_charge_id, :total_amount_cents, :invoice_date, presence: true
end
