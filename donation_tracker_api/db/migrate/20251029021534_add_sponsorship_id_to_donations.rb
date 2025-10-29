class AddSponsorshipIdToDonations < ActiveRecord::Migration[8.0]
  def change
    add_column :donations, :sponsorship_id, :bigint
    add_index :donations, :sponsorship_id
    add_foreign_key :donations, :sponsorships
  end
end
