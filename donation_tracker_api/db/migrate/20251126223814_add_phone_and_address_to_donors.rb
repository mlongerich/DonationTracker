class AddPhoneAndAddressToDonors < ActiveRecord::Migration[8.0]
  def change
    add_column :donors, :phone, :string
    add_column :donors, :address_line1, :string
    add_column :donors, :address_line2, :string
    add_column :donors, :city, :string
    add_column :donors, :state, :string
    add_column :donors, :zip_code, :string
    add_column :donors, :country, :string, default: 'USA'
  end
end
