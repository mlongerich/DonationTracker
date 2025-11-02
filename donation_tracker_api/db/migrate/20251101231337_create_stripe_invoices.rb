class CreateStripeInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :stripe_invoices do |t|
      t.string :stripe_invoice_id, null: false
      t.string :stripe_charge_id, null: false
      t.string :stripe_customer_id
      t.string :stripe_subscription_id
      t.integer :total_amount_cents, null: false
      t.date :invoice_date, null: false

      t.timestamps
    end
    add_index :stripe_invoices, :stripe_invoice_id, unique: true
    add_index :stripe_invoices, :stripe_charge_id
  end
end
