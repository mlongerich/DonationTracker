class AddOAuthToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :provider, :string
    add_column :users, :uid, :string
    add_column :users, :email, :string
    add_column :users, :name, :string
    add_column :users, :avatar_url, :string

    # Add index for OAuth lookup (uid must be unique within provider)
    add_index :users, [ :provider, :uid ], unique: true

    # Add index for email queries (domain validation, lookups)
    add_index :users, :email, unique: true
  end
end
