require 'rails_helper'

RSpec.describe Child, type: :model do
  describe "validations" do
    it "requires a name" do
      child = Child.new(name: nil)
      expect(child).not_to be_valid
      expect(child.errors[:name]).to include("can't be blank")
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
end
