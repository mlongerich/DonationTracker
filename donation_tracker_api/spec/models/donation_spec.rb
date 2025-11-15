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

  describe "status enum" do
    it "allows succeeded status" do
      donation = build(:donation, status: 'succeeded')
      expect(donation).to be_valid
      expect(donation).to be_succeeded
    end

    it "allows failed status" do
      donation = build(:donation, status: 'failed')
      expect(donation).to be_valid
      expect(donation).to be_failed
    end

    it "allows refunded status" do
      donation = build(:donation, status: 'refunded')
      expect(donation).to be_valid
      expect(donation).to be_refunded
    end

    it "allows canceled status" do
      donation = build(:donation, status: 'canceled')
      expect(donation).to be_valid
      expect(donation).to be_canceled
    end

    it "allows needs_attention status" do
      donation = build(:donation, status: 'needs_attention')
      expect(donation).to be_valid
      expect(donation).to be_needs_attention
    end

    it "rejects invalid status" do
      expect {
        build(:donation, status: 'invalid')
      }.to raise_error(ArgumentError)
    end

    it "defaults to succeeded" do
      donation = Donation.new(donor: create(:donor), amount: 10000, date: Date.today, payment_method: :stripe)
      expect(donation.status).to eq('succeeded')
    end
  end

  describe "scopes" do
    describe ".pending_review" do
      it "returns only non-succeeded donations" do
        succeeded = create(:donation, status: 'succeeded')
        failed = create(:donation, status: 'failed')
        refunded = create(:donation, status: 'refunded')
        canceled = create(:donation, status: 'canceled')
        needs_attention = create(:donation, status: 'needs_attention')

        results = Donation.pending_review

        expect(results).to contain_exactly(failed, refunded, canceled, needs_attention)
        expect(results).not_to include(succeeded)
      end
    end

    describe ".active" do
      it "returns only succeeded donations" do
        succeeded = create(:donation, status: 'succeeded')
        failed = create(:donation, status: 'failed')

        results = Donation.active

        expect(results).to contain_exactly(succeeded)
        expect(results).not_to include(failed)
      end
    end

    describe ".for_subscription" do
      it "returns donations for given subscription_id" do
        donation_with_sub = create(:donation, stripe_subscription_id: 'sub_123')
        donation_without_sub = create(:donation, stripe_subscription_id: nil)
        donation_different_sub = create(:donation, stripe_subscription_id: 'sub_456')

        results = Donation.for_subscription('sub_123')

        expect(results).to contain_exactly(donation_with_sub)
      end
    end
  end

  describe "validations" do
    describe "stripe_subscription_id uniqueness" do
      let(:child) { create(:child) }
      let(:donor) { create(:donor) }
      let(:sponsorship) { create(:sponsorship, donor: donor, child: child) }
      let!(:existing) do
        donation = build(:donation,
                         donor: donor,
                         stripe_subscription_id: 'sub_123',
                         sponsorship: sponsorship,
                         project: sponsorship.project)
        donation.write_attribute(:child_id, child.id)
        donation.save!
        donation
      end

      it "prevents duplicate subscription_id + child_id" do
        duplicate = build(:donation, stripe_subscription_id: 'sub_123')
        duplicate.write_attribute(:child_id, child.id)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:stripe_subscription_id]).to be_present
      end

      it "allows same subscription_id with different child" do
        other_child = create(:child)
        donor = create(:donor)
        sponsorship = create(:sponsorship, donor: donor, child: other_child)
        donation = build(:donation,
                         donor: donor,
                         stripe_subscription_id: 'sub_123',
                         sponsorship: sponsorship,
                         project: sponsorship.project)
        donation.write_attribute(:child_id, other_child.id)
        expect(donation).to be_valid
      end

      it "allows nil subscription_id" do
        donation = build(:donation, stripe_subscription_id: nil, child_id: child.id)
        donation.write_attribute(:child_id, child.id)
        expect(donation).to be_valid
      end

      it "allows nil child_id" do
        donation = build(:donation, stripe_subscription_id: 'sub_456', child_id: nil)
        expect(donation).to be_valid
      end
    end
  end

  describe "#needs_review?" do
    it "returns true for failed status" do
      donation = build(:donation, status: 'failed')
      expect(donation.needs_review?).to be true
    end

    it "returns true for refunded status" do
      donation = build(:donation, status: 'refunded')
      expect(donation.needs_review?).to be true
    end

    it "returns true for canceled status" do
      donation = build(:donation, status: 'canceled')
      expect(donation.needs_review?).to be true
    end

    it "returns true for needs_attention status" do
      donation = build(:donation, status: 'needs_attention')
      expect(donation.needs_review?).to be true
    end

    it "returns false for succeeded status" do
      donation = build(:donation, status: 'succeeded')
      expect(donation.needs_review?).to be false
    end
  end

  describe "#sponsorship?" do
    it "returns true when child_id present" do
      child = create(:child)
      donation = build(:donation)
      donation.write_attribute(:child_id, child.id)
      expect(donation.sponsorship?).to be true
    end

    it "returns false when child_id nil" do
      donation = build(:donation)
      donation.write_attribute(:child_id, nil)
      expect(donation.sponsorship?).to be false
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
