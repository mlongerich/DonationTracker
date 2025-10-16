class AddMergedIntoIdToDonors < ActiveRecord::Migration[8.0]
  def change
    add_column :donors, :merged_into_id, :integer
    add_index :donors, :merged_into_id
  end
end
