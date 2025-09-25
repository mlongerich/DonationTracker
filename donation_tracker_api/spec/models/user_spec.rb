require 'rails_helper'

RSpec.describe User, type: :model do
  describe "validations" do
    it "requires a username" do
      user = User.new
      expect(user).not_to be_valid
      expect(user.errors[:username]).to include("can't be blank")
    end
  end
end
