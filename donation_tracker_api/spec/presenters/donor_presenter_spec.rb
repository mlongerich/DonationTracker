require 'rails_helper'

RSpec.describe DonorPresenter do
  describe "#as_json" do
    it "includes displayable_email when email is not a placeholder" do
      donor = create(:donor, email: "john@example.com")
      presenter = described_class.new(donor)

      json = presenter.as_json

      expect(json[:displayable_email]).to eq("john@example.com")
    end

    it "returns nil for displayable_email when email is from mailinator.com" do
      donor = create(:donor, email: "test@mailinator.com")
      presenter = described_class.new(donor)

      json = presenter.as_json

      expect(json[:displayable_email]).to be_nil
    end

    it "returns nil for displayable_email when email is from MAILINATOR.COM (case insensitive)" do
      donor = create(:donor, email: "test@MAILINATOR.COM")
      presenter = described_class.new(donor)

      json = presenter.as_json

      expect(json[:displayable_email]).to be_nil
    end
  end
end
