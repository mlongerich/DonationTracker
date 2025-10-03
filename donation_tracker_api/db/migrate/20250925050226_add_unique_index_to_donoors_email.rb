class AddUniqueIndexToDonoorsEmail < ActiveRecord::Migration[8.0]
  def change
    add_index :donors, :email, unique: true
  end
end
