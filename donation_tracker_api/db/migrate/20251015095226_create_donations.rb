class CreateDonations < ActiveRecord::Migration[8.0]
  def change
    create_table :donations do |t|
      t.decimal :amount
      t.date :date
      t.references :donor, null: false, foreign_key: true
      t.string :status
      t.text :description

      t.timestamps
    end
  end
end
