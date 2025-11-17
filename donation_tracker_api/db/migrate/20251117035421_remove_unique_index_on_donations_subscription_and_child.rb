class RemoveUniqueIndexOnDonationsSubscriptionAndChild < ActiveRecord::Migration[8.0]
  def change
    remove_index :donations,
                 name: "index_donations_on_subscription_and_child",
                 column: [ :stripe_subscription_id, :child_id ],
                 unique: true,
                 where: "((child_id IS NOT NULL) AND (stripe_subscription_id IS NOT NULL))"
  end
end
