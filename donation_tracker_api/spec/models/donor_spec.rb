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

  it "generates unique email from phone when name and email are blank" do
    donor = create(:donor, name: "", email: "", phone: "5551234567")
    expect(donor.name).to eq("Anonymous")
    expect(donor.email).to eq("anonymous-5551234567@mailinator.com")
  end

  it "generates unique email from address when name and email are blank" do
    donor = create(:donor, name: "", email: "", address_line1: "123 Main St", city: "Springfield")
    expect(donor.name).to eq("Anonymous")
    expect(donor.email).to eq("anonymous-123mainst-springfield@mailinator.com")
  end

  it "prioritizes phone over address when both present and name/email blank" do
    donor = create(:donor, name: "", email: "", phone: "5551234567", address_line1: "123 Main St", city: "Springfield")
    expect(donor.name).to eq("Anonymous")
    expect(donor.email).to eq("anonymous-5551234567@mailinator.com")
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
      sponsorship = create(:sponsorship, donor: donor, child: child, monthly_amount: 100, end_date: 1.month.ago)

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

  describe "archive restrictions for active sponsorships" do
    it "cannot archive donor with active sponsorship" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100, end_date: nil)

      expect(donor.discard).to be false
      expect(donor.errors[:base]).to include("Cannot archive donor with active sponsorships")
      expect(donor.discarded?).to be false
    end

    it "can archive donor with only ended sponsorships" do
      donor = create(:donor)
      child = create(:child)
      create(:sponsorship, donor: donor, child: child, monthly_amount: 100, end_date: 1.month.ago)

      expect(donor.discard).to be true
      expect(donor.discarded?).to be true
    end

    it "can archive donor with no sponsorships" do
      donor = create(:donor)

      expect(donor.discard).to be true
      expect(donor.discarded?).to be true
    end
  end

  describe "#last_donation_date" do
    it "returns most recent donation date when donations exist" do
      donor = create(:donor)
      create(:donation, donor: donor, date: Date.new(2025, 1, 1))
      create(:donation, donor: donor, date: Date.new(2025, 3, 15))
      create(:donation, donor: donor, date: Date.new(2025, 2, 10))

      expect(donor.last_donation_date).to eq(Date.new(2025, 3, 15))
    end

    it "returns nil when donor has no donations" do
      donor = create(:donor)

      expect(donor.last_donation_date).to be_nil
    end
  end

  describe "phone validation" do
    it "accepts valid phone number" do
      donor = build(:donor, phone: "5551234567")
      expect(donor).to be_valid
    end

    it "rejects invalid phone number" do
      donor = build(:donor, phone: "123")
      expect(donor).not_to be_valid
      expect(donor.errors[:phone]).to be_present
    end

    it "allows blank phone number" do
      donor = build(:donor, phone: nil)
      expect(donor).to be_valid
    end
  end

  describe "zip code validation" do
    it "accepts valid US 5-digit zip code" do
      donor = build(:donor, zip_code: "12345", country: "US")
      expect(donor).to be_valid
    end

    it "rejects invalid zip code" do
      donor = build(:donor, zip_code: "ABCDE", country: "US")
      expect(donor).not_to be_valid
      expect(donor.errors[:zip_code]).to be_present
    end

    it "allows blank zip code" do
      donor = build(:donor, zip_code: nil)
      expect(donor).to be_valid
    end

    it "pads 4-digit US zip code with leading zero" do
      donor = build(:donor, zip_code: "6419", country: "US")
      donor.valid?
      expect(donor.zip_code).to eq("06419")
    end

    it "does not pad 4-digit zip code for non-US countries" do
      donor = build(:donor, zip_code: "1234", country: "CA")
      donor.valid?
      expect(donor.zip_code).to eq("1234")
    end

    it "does not modify 5-digit US zip codes" do
      donor = build(:donor, zip_code: "12345", country: "US")
      donor.valid?
      expect(donor.zip_code).to eq("12345")
    end
  end

  describe "#full_address" do
    it "returns nil when all address fields blank" do
      donor = build(:donor)
      expect(donor.full_address).to be_nil
    end

    it "returns formatted address when all fields present" do
      donor = build(:donor,
        address_line1: "123 Main St",
        address_line2: "Apt 4B",
        city: "San Francisco",
        state: "CA",
        zip_code: "94102"
      )

      expect(donor.full_address).to eq("123 Main St\nApt 4B\nSan Francisco CA 94102")
    end
  end
end
