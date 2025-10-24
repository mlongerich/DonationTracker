class AddDiscardedAtToChildren < ActiveRecord::Migration[8.0]
  def change
    add_column :children, :discarded_at, :datetime
    add_index :children, :discarded_at
  end
end
