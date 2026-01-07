require 'rails_helper'

RSpec.describe User, type: :model do
  describe "OAuth authentication" do
    it "can be created with OAuth data from Google" do
      user = User.create!(
        provider: 'google_oauth2',
        uid: '123456789',
        email: 'admin@projectsforasia.com',
        name: 'Test Admin',
        avatar_url: 'https://example.com/avatar.jpg'
      )

      expect(user).to be_persisted
      expect(user.provider).to eq('google_oauth2')
      expect(user.uid).to eq('123456789')
      expect(user.email).to eq('admin@projectsforasia.com')
    end
  end

  describe "domain validation" do
    it "rejects email addresses not from @projectsforasia.com domain" do
      user = User.new(
        provider: 'google_oauth2',
        uid: '987654321',
        email: 'unauthorized@gmail.com',
        name: 'Unauthorized User'
      )

      expect(user).not_to be_valid
      expect(user.errors[:email]).to include('must be a @projectsforasia.com email address')
    end
  end
end
