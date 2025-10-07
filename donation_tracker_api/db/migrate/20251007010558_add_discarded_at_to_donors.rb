class AddDiscardedAtToDonors < ActiveRecord::Migration[8.0]
  def change
    add_column :donors, :discarded_at, :datetime
    add_index :donors, :discarded_at
  end
end
