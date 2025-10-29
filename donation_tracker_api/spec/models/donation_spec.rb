require 'rails_helper'

RSpec.describe Donation, type: :model do
  describe "validations" do
    it "requires an amount" do
      donation = build(:donation, amount: nil)
      expect(donation).not_to be_valid
      expect(donation.errors[:amount]).to include("can't be blank")
    end

    it "requires amount to be greater than zero" do
      donation = build(:donation, amount: 0)
      expect(donation).not_to be_valid
      expect(donation.errors[:amount]).to include("must be greater than 0")
    end

    it "requires a date" do
      donation = build(:donation, date: nil)
      expect(donation).not_to be_valid
      expect(donation.errors[:date]).to include("can't be blank")
    end

    it "does not allow future dates" do
      donation = build(:donation, date: 1.day.from_now)
      expect(donation).not_to be_valid
      expect(donation.errors[:date]).to include("cannot be in the future")
    end
  end

  describe "auto-unarchive associations" do
    it "restores archived donor when creating donation" do
      donor = create(:donor)
      donor.discard

      expect(donor.discarded?).to be true

      donation = create(:donation, donor: donor)

      expect(donor.reload.discarded?).to be false
      expect(donation.donor).to eq(donor)
    end

    it "restores archived project when creating donation" do
      donor = create(:donor)
      project = create(:project)
      project.discard

      expect(project.discarded?).to be true

      donation = create(:donation, donor: donor, project: project)

      expect(project.reload.discarded?).to be false
      expect(donation.project).to eq(project)
    end

    it "does not modify active donor and project" do
      donor = create(:donor)
      project = create(:project)

      expect(donor.discarded?).to be false
      expect(project.discarded?).to be false

      donation = create(:donation, donor: donor, project: project)

      expect(donor.reload.discarded?).to be false
      expect(project.reload.discarded?).to be false
    end
  end
end
