require 'rails_helper'

RSpec.describe DonorService, type: :service do
  describe ".find_or_update_by_email" do
    before do
      Donor.delete_all
    end

    it "creates new donor when email not found" do
      donor_attrs = { name: "John Doe", email: "john@example.com" }
      transaction_date = Time.current

      result = DonorService.find_or_update_by_email(donor_attrs, transaction_date)

      expect(result[:created]).to be true
      expect(result[:donor]).to be_persisted
      expect(result[:donor].name).to eq("John Doe")
      expect(result[:donor].email).to eq("john@example.com")
    end

    it "updates donor name when newer record has a name" do
      existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.week.ago)
      newer_data = { name: "John Johnson", email: "john@example.com" }

      result = DonorService.find_or_update_by_email(newer_data, 1.day.ago)

      expect(result[:created]).to be false
      expect(result[:donor].id).to eq(existing.id)
      expect(result[:donor].name).to eq("John Johnson")
    end

    it "preserves existing name when newer record has blank name" do
      existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.week.ago)
      newer_data = { name: "", email: "john@example.com" }

      result = DonorService.find_or_update_by_email(newer_data, 1.day.ago)

      expect(result[:created]).to be false
      expect(result[:donor].id).to eq(existing.id)
      expect(result[:donor].name).to eq("John Smith")  # Preserved!
    end

    it "does not update when existing data is newer" do
      existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.day.ago)
      older_data = { name: "John Johnson", email: "john@example.com" }

      result = DonorService.find_or_update_by_email(older_data, 1.week.ago)

      expect(result[:created]).to be false
      expect(result[:donor].id).to eq(existing.id)
      expect(result[:donor].name).to eq("John Smith")  # Unchanged
    end

    it "handles submitting blank name and blank email multiple times" do
      # First submission with blank name and blank email
      first_result = DonorService.find_or_update_by_email({ name: "", email: "" }, Time.current)

      expect(first_result[:created]).to be true
      expect(first_result[:donor].name).to eq("Anonymous")
      expect(first_result[:donor].email).to eq("Anonymous@mailinator.com")

      first_donor_id = first_result[:donor].id

      # Second submission with blank name and blank email (should update same donor)
      second_result = DonorService.find_or_update_by_email({ name: "", email: "" }, Time.current + 1.hour)

      expect(second_result[:created]).to be false
      expect(second_result[:donor].id).to eq(first_donor_id)
      expect(second_result[:donor].name).to eq("Anonymous")
      expect(second_result[:donor].email).to eq("Anonymous@mailinator.com")
    end
  end
end
