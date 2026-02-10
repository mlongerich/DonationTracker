class DropFailedStripePayments < ActiveRecord::Migration[8.0]
  def up
    drop_table :failed_stripe_payments if table_exists?(:failed_stripe_payments)
  end

  def down
    create_table :failed_stripe_payments do |t|
      t.string :stripe_transaction_id, null: false
      t.string :donor_name
      t.string :donor_email
      t.integer :amount_cents, default: 0, null: false
      t.date :payment_date, null: false
      t.string :status, null: false
      t.text :description
      t.jsonb :raw_data, default: {}
      t.timestamps

      t.index :payment_date
      t.index :status
      t.index :stripe_transaction_id, unique: true
    end
  end
end
