require 'rails_helper'

RSpec.describe Child, type: :model do
  describe "validations" do
    it "requires a name" do
      child = Child.new(name: nil)
      expect(child).not_to be_valid
      expect(child.errors[:name]).to include("can't be blank")
    end
  end

  describe "gender" do
    it "accepts gender as boy" do
      child = Child.new(name: "Test", gender: "boy")
      expect(child.gender).to eq("boy")
    end

    it "accepts gender as girl" do
      child = Child.new(name: "Test", gender: "girl")
      expect(child.gender).to eq("girl")
    end

    it "accepts nil gender (optional field)" do
      child = Child.new(name: "Test", gender: nil)
      expect(child.gender).to be_nil
      expect(child).to be_valid
    end
  end

  describe "associations" do
    it "has many sponsorships" do
      expect(Child.new).to respond_to(:sponsorships)
    end

    it "has many donors through sponsorships" do
      expect(Child.new).to respond_to(:donors)
    end
  end

  describe "association behavior" do
    it "returns associated sponsorships" do
      child = Child.create!(name: "Test Child")
      expect(child.sponsorships).to eq([])
    end
  end

  describe "cascade delete protection" do
    let(:child) { create(:child) }
    let(:donor) { create(:donor) }

    it "cannot delete child with sponsorships" do
      create(:sponsorship, child: child, donor: donor)

      expect { child.destroy! }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "can delete child with no sponsorships" do
      expect { child.destroy! }.not_to raise_error
    end
  end

  describe "#can_be_deleted?" do
    let(:child) { create(:child) }
    let(:donor) { create(:donor) }

    it "returns false when sponsorships exist" do
      create(:sponsorship, child: child, donor: donor)

      expect(child.can_be_deleted?).to be false
    end

    it "returns true when no sponsorships exist" do
      expect(child.can_be_deleted?).to be true
    end
  end

  describe "soft delete" do
    it "sets discarded_at timestamp when discarded" do
      child = create(:child)

      child.discard

      expect(child.discarded_at).not_to be_nil
    end

    it "kept scope excludes discarded children" do
      active_child = create(:child, name: "Active")
      discarded_child = create(:child, name: "Discarded")
      discarded_child.discard

      children = Child.kept

      expect(children).to include(active_child)
      expect(children).not_to include(discarded_child)
    end
  end

  describe "archive restrictions for active sponsorships" do
    it "cannot archive child with active sponsorship" do
      child = create(:child)
      donor = create(:donor)
      create(:sponsorship, child: child, donor: donor, monthly_amount: 100, end_date: nil)

      expect(child.discard).to be false
      expect(child.errors[:base]).to include("Cannot archive child with active sponsorships")
      expect(child.discarded?).to be false
    end

    it "can archive child with no active sponsorships" do
      child = create(:child)

      expect(child.discard).to be true
      expect(child.discarded?).to be true
    end
  end

  describe "#last_donation_date" do
    it "returns most recent donation date through sponsorships" do
      child = create(:child)
      donor = create(:donor)
      sponsorship = create(:sponsorship, child: child, donor: donor, monthly_amount: 100)
      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 1, 1))
      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 3, 15))
      create(:donation, donor: donor, sponsorship: sponsorship, date: Date.new(2025, 2, 10))

      expect(child.last_donation_date).to eq(Date.new(2025, 3, 15))
    end

    it "returns nil when child has no donations" do
      child = create(:child)

      expect(child.last_donation_date).to be_nil
    end
  end

  describe "Ransack security whitelists" do
    describe ".ransackable_attributes" do
      it "returns whitelisted attributes for search" do
        expected_attributes = %w[name discarded_at]

        expect(Child.ransackable_attributes).to match_array(expected_attributes)
      end

      it "prevents searching on non-whitelisted attributes" do
        non_whitelisted = %w[id gender created_at updated_at]

        non_whitelisted.each do |attr|
          expect(Child.ransackable_attributes).not_to include(attr)
        end
      end
    end

    describe ".ransackable_associations" do
      it "returns whitelisted associations for search" do
        expected_associations = %w[sponsorships donors]

        expect(Child.ransackable_associations).to match_array(expected_associations)
      end

      it "prevents searching on non-whitelisted associations" do
        expect(Child.ransackable_associations).not_to include("donations")
      end
    end
  end
end
