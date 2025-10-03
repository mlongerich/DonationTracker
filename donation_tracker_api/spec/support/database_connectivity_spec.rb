require 'rails_helper'

RSpec.describe "Database Connectivity" do
  it "can connect to the database" do
    expect { ActiveRecord::Base.connection.execute("SELECT 1") }.not_to raise_error
  end

  it "can perform basic database operations" do
    expect { User.count }.not_to raise_error
  end

  it "development and test databases are properly configured" do
    # Ensure we can connect in both environments
    expect(ActiveRecord::Base.connection).to be_active
    expect(Rails.env).to be_in([ 'development', 'test' ])
  end
end
