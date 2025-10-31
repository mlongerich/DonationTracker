class AddChildIdToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :child_id, :integer
    add_index :donations, :child_id
  end
end
