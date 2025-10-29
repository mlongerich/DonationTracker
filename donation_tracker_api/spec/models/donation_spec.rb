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

  describe "associations" do
    it "can belong to a sponsorship" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child)
      donation = create(:donation, donor: donor, sponsorship: sponsorship)

      expect(donation.sponsorship).to eq(sponsorship)
    end
  end

  describe "sponsorship project validation" do
    it "requires sponsorship_id for donations to sponsorship projects" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child)

      # Donation to sponsorship project without sponsorship_id
      donation = build(:donation, donor: donor, project: sponsorship.project, sponsorship_id: nil)

      expect(donation).not_to be_valid
      expect(donation.errors[:sponsorship_id]).to include("must be present for sponsorship projects")
    end

    it "allows donations to general projects without sponsorship_id" do
      donor = create(:donor)
      general_project = create(:project, project_type: :general)

      donation = build(:donation, donor: donor, project: general_project, sponsorship_id: nil)

      expect(donation).to be_valid
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
