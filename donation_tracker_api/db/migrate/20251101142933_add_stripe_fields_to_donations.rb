class AddStripeFieldsToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :stripe_charge_id, :string
    add_column :donations, :stripe_customer_id, :string
    add_column :donations, :stripe_subscription_id, :string

    add_index :donations, :stripe_charge_id, unique: true
    add_index :donations, :stripe_customer_id
  end
end
