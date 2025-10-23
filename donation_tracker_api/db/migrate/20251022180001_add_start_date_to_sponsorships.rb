class AddStartDateToSponsorships < ActiveRecord::Migration[8.0]
  def change
    add_column :sponsorships, :start_date, :date
  end
end
