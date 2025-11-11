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

    it "requires payment_method for new donations" do
      donation = build(:donation, payment_method: nil)
      expect(donation).not_to be_valid
      expect(donation.errors[:payment_method]).to include("can't be blank")
    end

    it "allows stripe payment_method" do
      donation = build(:donation, payment_method: :stripe)
      expect(donation).to be_valid
    end

    it "rejects invalid payment_method values" do
      expect { build(:donation, payment_method: :invalid) }.to raise_error(ArgumentError)
    end
  end

  describe "payment_method enum" do
    it "provides predicate methods for stripe" do
      donation = create(:donation, payment_method: :stripe)
      expect(donation.payment_method_stripe?).to be true
      expect(donation.payment_method_check?).to be false
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

  describe "sponsorship auto-creation from child_id" do
    it "creates sponsorship when child_id provided and no sponsorship exists" do
      donor = create(:donor)
      child = create(:child)

      expect do
        donation = create(:donation, donor: donor, child_id: child.id)
        expect(donation.sponsorship_id).not_to be_nil
      end.to change(Sponsorship, :count).by(1)
    end

    it "uses existing sponsorship when child_id and amount match existing sponsorship" do
      donor = create(:donor)
      child = create(:child)
      existing_sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      expect do
        donation = create(:donation, donor: donor, child_id: child.id, amount: 100)
        expect(donation.sponsorship_id).to eq(existing_sponsorship.id)
      end.not_to change(Sponsorship, :count)
    end

    it "creates new sponsorship when amount differs from existing sponsorship" do
      donor = create(:donor)
      child = create(:child)
      existing_sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 50)

      expect do
        donation = create(:donation, donor: donor, child_id: child.id, amount: 100)
        expect(donation.sponsorship_id).not_to eq(existing_sponsorship.id)
        expect(donation.sponsorship.monthly_amount).to eq(100)
      end.to change(Sponsorship, :count).by(1)
    end

    it "creates new sponsorship when matching archived sponsorship exists" do
      donor = create(:donor)
      child = create(:child)
      archived_sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 100, end_date: 1.month.ago)

      expect do
        donation = create(:donation, donor: donor, child_id: child.id, amount: 100)
        expect(donation.sponsorship_id).not_to eq(archived_sponsorship.id)
        expect(donation.sponsorship.active?).to be true
      end.to change(Sponsorship, :count).by(1)
    end

    it "does not create sponsorship when child_id is nil" do
      donor = create(:donor)

      expect do
        donation = create(:donation, donor: donor, child_id: nil)
        expect(donation.sponsorship_id).to be_nil
      end.not_to change(Sponsorship, :count)
    end

    it "sets project_id to sponsorship's project when child_id provided" do
      donor = create(:donor)
      child = create(:child)

      donation = create(:donation, donor: donor, child_id: child.id)

      expect(donation.project_id).to eq(donation.sponsorship.project_id)
    end
  end
end
