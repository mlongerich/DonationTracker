FactoryBot.define do
  factory :stripe_invoice do
    stripe_invoice_id { "MyString" }
    stripe_charge_id { "MyString" }
    stripe_customer_id { "MyString" }
    stripe_subscription_id { "MyString" }
    total_amount_cents { 1 }
    invoice_date { "2025-11-01" }
  end
end
