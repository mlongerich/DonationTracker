# frozen_string_literal: true

require "rails_helper"

RSpec.describe DonorExportService do
  describe ".generate_csv" do
    it "returns CSV with headers only when donor list is empty" do
      csv_data = described_class.generate_csv(Donor.none)
      rows = CSV.parse(csv_data)

      expect(rows.count).to eq(1)
      expect(rows[0]).to eq([
        "Name",
        "Email",
        "Phone",
        "Address Line 1",
        "Address Line 2",
        "City",
        "State",
        "Zip",
        "Country",
        "Total Donated",
        "Donation Count",
        "Last Donation Date",
        "Status"
      ])
    end

    it "returns correct CSV row with $0.00 total for donor with no donations" do
      donor = create(:donor, :with_full_contact)

      csv_data = described_class.generate_csv(Donor.where(id: donor.id))
      rows = CSV.parse(csv_data)

      expect(rows.count).to eq(2)
      expect(rows[1][0]).to eq(donor.name)
      expect(rows[1][1]).to eq(donor.email)
      expect(rows[1][2]).to eq(donor.phone)
      expect(rows[1][3]).to eq(donor.address_line1)
      expect(rows[1][4]).to eq(donor.address_line2)
      expect(rows[1][5]).to eq(donor.city)
      expect(rows[1][6]).to eq(donor.state)
      expect(rows[1][7]).to eq(donor.zip_code)
      expect(rows[1][8]).to eq(donor.country)
      expect(rows[1][9]).to eq("$0.00")
      expect(rows[1][10]).to eq("0")
      expect(rows[1][11]).to eq("")
      expect(rows[1][12]).to eq("Active")
    end

    it "returns correct aggregates for multiple donors with donations" do
      donor1 = create(:donor, name: "Alice")
      donor2 = create(:donor, name: "Bob")
      project = create(:project)

      create(:donation, donor: donor1, project: project, amount: 10000)
      create(:donation, donor: donor1, project: project, amount: 5000)
      create(:donation, donor: donor2, project: project, amount: 2500)

      csv_data = described_class.generate_csv(Donor.where(id: [ donor1.id, donor2.id ]).order(:name))
      rows = CSV.parse(csv_data)

      expect(rows.count).to eq(3)
      expect(rows[1][0]).to eq("Alice")
      expect(rows[1][9]).to eq("$150.00")
      expect(rows[1][10]).to eq("2")
      expect(rows[2][0]).to eq("Bob")
      expect(rows[2][9]).to eq("$25.00")
      expect(rows[2][10]).to eq("1")
    end

    it "returns last donation date for donor with donations" do
      donor = create(:donor, name: "Charlie")
      project = create(:project)

      create(:donation, donor: donor, project: project, amount: 1000, date: Date.parse("2024-01-15"))
      create(:donation, donor: donor, project: project, amount: 2000, date: Date.parse("2024-03-20"))

      csv_data = described_class.generate_csv(Donor.where(id: donor.id))
      rows = CSV.parse(csv_data)

      expect(rows[1][11]).to eq("2024-03-20")
    end

    it "exports empty string for mailinator.com emails" do
      donor = create(:donor, name: "Anonymous Donor", email: "anonymous@mailinator.com")

      csv_data = described_class.generate_csv(Donor.where(id: donor.id))
      rows = CSV.parse(csv_data)

      expect(rows[1][0]).to eq("Anonymous Donor")
      expect(rows[1][1]).to eq("")
    end
  end
end
