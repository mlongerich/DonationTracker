class StripeInvoice < ApplicationRecord
  has_many :donations, foreign_key: :stripe_invoice_id, primary_key: :stripe_invoice_id

  validates :stripe_invoice_id, :stripe_charge_id, :total_amount_cents, :invoice_date, presence: true
end
