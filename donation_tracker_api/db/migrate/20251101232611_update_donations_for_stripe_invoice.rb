class UpdateDonationsForStripeInvoice < ActiveRecord::Migration[8.0]
  def up
    # Remove unique index on stripe_charge_id (allow multiple donations per charge)
    remove_index :donations, column: :stripe_charge_id, unique: true if index_exists?(:donations, :stripe_charge_id, unique: true)

    # Add non-unique index back
    add_index :donations, :stripe_charge_id unless index_exists?(:donations, :stripe_charge_id)

    # Add foreign key reference to stripe_invoices (by stripe_invoice_id string)
    add_column :donations, :stripe_invoice_id, :string
    add_index :donations, :stripe_invoice_id
  end

  def down
    remove_index :donations, :stripe_invoice_id if index_exists?(:donations, :stripe_invoice_id)
    remove_column :donations, :stripe_invoice_id

    remove_index :donations, :stripe_charge_id if index_exists?(:donations, :stripe_charge_id)
    add_index :donations, :stripe_charge_id, unique: true
  end
end
