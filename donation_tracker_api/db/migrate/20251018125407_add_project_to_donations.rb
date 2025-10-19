class AddProjectToDonations < ActiveRecord::Migration[8.0]
  def change
    add_reference :donations, :project, null: true, foreign_key: true
  end
end
