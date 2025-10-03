class AddEmailToDonors < ActiveRecord::Migration[8.0]
  def change
    add_column :donors, :email, :string
  end
end
