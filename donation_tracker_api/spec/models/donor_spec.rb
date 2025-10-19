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
end
