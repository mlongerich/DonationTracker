require 'rails_helper'

RSpec.describe Donor, type: :model do
  it "sets name to 'Anonymous' when no name provided" do
    donor = build(:donor, name: nil, email: "test@example.com")
    expect(donor).to be_valid
    donor.save!
    expect(donor.name).to eq("Anonymous")
  end

  it "generates email from name when no email provided" do
    donor = build(:donor, name: "John Doe", email: nil)
    expect(donor).to be_valid
    donor.save!
    expect(donor.email).to eq("JohnDoe@mailinator.com")
  end

  it "validates email format when email is provided" do
    donor = build(:donor, name: "John Doe", email: "invalid-email")
    expect(donor).not_to be_valid
    expect(donor.errors[:email]).to include("is invalid")
  end

  it "sets name to 'Anonymous' when name is blank" do
    donor = create(:donor, name: "", email: "test@example.com")
    expect(donor.name).to eq("Anonymous")
  end

  it "requires email to be unique" do
    create(:donor, name: "John Doe", email: "test@example.com")
    duplicate_donor = build(:donor, name: "Jane Smith", email: "test@example.com")
    expect(duplicate_donor).not_to be_valid
    expect(duplicate_donor.errors[:email]).to include("has already been taken")
  end

  it "generates email from name when email is blank" do
    donor = create(:donor, name: "John Doe", email: "")
    expect(donor.email).to eq("JohnDoe@mailinator.com")
  end

  it "handles completely missing data with full fallback" do
    donor = create(:donor, name: "", email: "")
    expect(donor.name).to eq("Anonymous")
    expect(donor.email).to eq("Anonymous@mailinator.com")
  end

  it "tracks changes with PaperTrail when donor is updated" do
    donor = create(:donor, name: "John Smith", email: "john@example.com")

    donor.update!(name: "John Johnson")

    expect(donor.versions.count).to eq(2)  # create + update
    expect(donor.versions.first.event).to eq("create")
    expect(donor.versions.last.event).to eq("update")
  end

  it "has many donations" do
    association = Donor.reflect_on_association(:donations)
    expect(association.macro).to eq(:has_many)
  end

  it "has many sponsorships" do
    expect(Donor.new).to respond_to(:sponsorships)
  end

  it "has many children through sponsorships" do
    expect(Donor.new).to respond_to(:children)
  end

  describe "cascade delete restrictions" do
    it "restricts deletion when donations exist" do
      donor = create(:donor)
      create(:donation, donor: donor)

      expect { donor.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "restricts deletion when sponsorships exist" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      expect { donor.destroy }.to raise_error(ActiveRecord::DeleteRestrictionError)
    end

    it "allows deletion when no associations exist" do
      donor = create(:donor)

      expect { donor.destroy }.to change(Donor, :count).by(-1)
    end
  end

  describe "#can_be_deleted?" do
    it "returns false when donor has donations" do
      donor = create(:donor)
      create(:donation, donor: donor)

      expect(donor.can_be_deleted?).to be false
    end

    it "returns false when donor has sponsorships" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      expect(donor.can_be_deleted?).to be false
    end

    it "returns true when donor has no associations" do
      donor = create(:donor)

      expect(donor.can_be_deleted?).to be true
    end
  end

  describe "soft delete with associations" do
    it "preserves donations when donor is discarded" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)

      donor.discard

      expect(donor.discarded?).to be true
      expect(donation.reload.donor).to eq(donor)
    end

    it "preserves sponsorships when donor is discarded" do
      donor = create(:donor)
      child = create(:child)
      sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 100)

      donor.discard

      expect(donor.discarded?).to be true
      expect(sponsorship.reload.donor).to eq(donor)
    end

    it "restores access to donations when donor is restored" do
      donor = create(:donor)
      donation = create(:donation, donor: donor)

      donor.discard
      donor.undiscard

      expect(donor.discarded?).to be false
      expect(donation.reload.donor).to eq(donor)
    end
  end
end
