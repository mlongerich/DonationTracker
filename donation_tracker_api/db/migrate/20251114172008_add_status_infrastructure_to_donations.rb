class AddStatusInfrastructureToDonations < ActiveRecord::Migration[8.0]
  def change
    # Update existing status column to have default and NOT NULL
    change_column_default :donations, :status, from: nil, to: 'succeeded'
    change_column_null :donations, :status, false, 'succeeded'

    # Add new tracking fields
    add_column :donations, :duplicate_subscription_detected, :boolean, default: false
    add_column :donations, :needs_attention_reason, :text

    # Add composite unique index for subscription + child (sponsorships only)
    # Only enforces when both subscription_id and child_id are present
    add_index :donations,
              [ :stripe_subscription_id, :child_id ],
              unique: true,
              where: "child_id IS NOT NULL AND stripe_subscription_id IS NOT NULL",
              name: 'index_donations_on_subscription_and_child'
  end
end
