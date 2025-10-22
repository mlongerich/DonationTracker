require 'rails_helper'

RSpec.describe Sponsorship, type: :model do
  describe "associations" do
    it "belongs to donor" do
      expect(Sponsorship.new).to respond_to(:donor)
    end

    it "belongs to child" do
      expect(Sponsorship.new).to respond_to(:child)
    end

    it "belongs to project" do
      expect(Sponsorship.new).to respond_to(:project)
    end
  end

  describe "validations" do
    it "requires monthly_amount" do
      sponsorship = Sponsorship.new(monthly_amount: nil)
      expect(sponsorship).not_to be_valid
      expect(sponsorship.errors[:monthly_amount]).to include("can't be blank")
    end

    it "requires monthly_amount to be positive" do
      sponsorship = Sponsorship.new(monthly_amount: -10)
      expect(sponsorship).not_to be_valid
      expect(sponsorship.errors[:monthly_amount]).to include("must be greater than 0")
    end
  end

  describe "scopes" do
    it "returns active sponsorships when end_date is null" do
      expect(Sponsorship).to respond_to(:active)
    end
  end

  describe "#active?" do
    it "returns true when end_date is nil" do
      sponsorship = Sponsorship.new(end_date: nil)
      expect(sponsorship.active?).to be true
    end
  end

  describe "callbacks" do
    it "auto-creates a sponsorship project after creation" do
      donor = create(:donor)
      child = create(:child, name: "Maria")

      sponsorship = Sponsorship.create!(
        donor: donor,
        child: child,
        monthly_amount: 50
      )

      expect(sponsorship.project).to be_present
      expect(sponsorship.project.project_type).to eq("sponsorship")
      expect(sponsorship.project.title).to eq("Sponsor Maria")
      expect(sponsorship.project.system).to eq(false)
    end
  end
end
