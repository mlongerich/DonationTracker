class CreateSponsorships < ActiveRecord::Migration[8.0]
  def change
    create_table :sponsorships do |t|
      t.references :donor, null: false, foreign_key: true
      t.references :child, null: false, foreign_key: true
      t.references :project, null: false, foreign_key: true
      t.decimal :monthly_amount
      t.date :end_date

      t.timestamps
    end
  end
end
