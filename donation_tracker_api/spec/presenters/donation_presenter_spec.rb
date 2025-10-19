require 'rails_helper'

RSpec.describe DonationPresenter do
  describe "#as_json" do
    it "includes donation id" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)
      presenter = described_class.new(donation)

      json = presenter.as_json

      expect(json[:id]).to eq(donation.id)
    end

    it "includes donation amount" do
      donor = create(:donor)
      donation = create(:donation, donor: donor, amount: 125.50)
      presenter = described_class.new(donation)

      json = presenter.as_json

      expect(json[:amount]).to eq(125.50)
    end

    it "includes donor_name from associated donor" do
      donor = create(:donor, name: "Jane Smith")
      donation = create(:donation, donor: donor)
      presenter = described_class.new(donation)

      json = presenter.as_json

      expect(json[:donor_name]).to eq("Jane Smith")
    end

    it "includes project_title from associated project" do
      donor = create(:donor)
      project = create(:project, title: "Summer Campaign")
      donation = create(:donation, donor: donor, project: project)
      presenter = described_class.new(donation)

      json = presenter.as_json

      expect(json[:project_title]).to eq("Summer Campaign")
    end

    it "returns 'General Donation' when project is nil" do
      donor = create(:donor)
      donation = create(:donation, donor: donor, project: nil)
      presenter = described_class.new(donation)

      json = presenter.as_json

      expect(json[:project_title]).to eq("General Donation")
    end
  end
end
