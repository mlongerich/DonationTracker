class AddGenderToChildren < ActiveRecord::Migration[8.0]
  def change
    add_column :children, :gender, :string
  end
end
