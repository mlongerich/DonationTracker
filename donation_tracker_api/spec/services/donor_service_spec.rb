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

  describe ".find_or_update_by_email_or_stripe_customer" do
    before do
      Donor.delete_all
      Donation.delete_all
    end

    it "finds donor by stripe_customer_id ignoring different email" do
      # Create donor with donation that has stripe_customer_id
      donor = Donor.create!(name: "John Doe", email: "john@example.com")
      project = Project.create!(title: "Test Project", project_type: :general)
      Donation.create!(
        donor: donor,
        project: project,
        amount: 10000,
        date: Date.today,
        stripe_customer_id: "cus_123"
      )

      # Try to find with same stripe_customer_id but different email
      result = DonorService.find_or_update_by_email_or_stripe_customer(
        { name: "Different Name", email: "different@example.com" },
        "cus_123",
        Time.current
      )

      # Should return existing donor (found by stripe_customer_id)
      expect(result[:donor].id).to eq(donor.id)
      expect(result[:created]).to be false
      expect(result[:donor].email).to eq("john@example.com")  # Original email preserved
    end

    it "follows merge chain when donor was merged" do
      # Create original donor with donation
      donor1 = Donor.create!(name: "John Doe", email: "john@example.com")
      project = Project.create!(title: "Test Project", project_type: :general)
      Donation.create!(
        donor: donor1,
        project: project,
        amount: 10000,
        date: Date.today,
        stripe_customer_id: "cus_123"
      )

      # Create merged donor
      donor2 = Donor.create!(name: "John Doe", email: "john.doe@example.com")

      # Simulate merge: donor1 was merged into donor2
      donor1.update_column(:merged_into_id, donor2.id)
      donor1.discard

      # Try to find with stripe_customer_id
      result = DonorService.find_or_update_by_email_or_stripe_customer(
        { name: "John Doe", email: "john@example.com" },
        "cus_123",
        Time.current
      )

      # Should return merged donor (donor2), not original (donor1)
      expect(result[:donor].id).to eq(donor2.id)
      expect(result[:redirected]).to be true
      expect(result[:created]).to be false
    end

    it "follows multi-level merge chain (A→B→C)" do
      # Create donor chain: A → B → C
      donor_a = Donor.create!(name: "Donor A", email: "a@example.com")
      donor_b = Donor.create!(name: "Donor B", email: "b@example.com")
      donor_c = Donor.create!(name: "Donor C", email: "c@example.com")

      project = Project.create!(title: "Test Project", project_type: :general)
      Donation.create!(
        donor: donor_a,
        project: project,
        amount: 10000,
        date: Date.today,
        stripe_customer_id: "cus_multi"
      )

      # Simulate multi-level merge: A → B, then B → C
      donor_a.update_column(:merged_into_id, donor_b.id)
      donor_a.discard
      donor_b.update_column(:merged_into_id, donor_c.id)
      donor_b.discard

      # Try to find with stripe_customer_id
      result = DonorService.find_or_update_by_email_or_stripe_customer(
        { name: "Donor A", email: "a@example.com" },
        "cus_multi",
        Time.current
      )

      # Should return final donor in chain (donor_c)
      expect(result[:donor].id).to eq(donor_c.id)
      expect(result[:redirected]).to be true
    end

    it "falls back to email lookup when stripe_customer_id not found" do
      # Create donor without any stripe donations
      existing_donor = Donor.create!(name: "Jane Doe", email: "jane@example.com", last_updated_at: 1.week.ago)

      # Call with nil stripe_customer_id, should use email
      result = DonorService.find_or_update_by_email_or_stripe_customer(
        { name: "Jane Doe", email: "jane@example.com" },
        nil,
        Time.current
      )

      # Should find by email
      expect(result[:donor].id).to eq(existing_donor.id)
      expect(result[:created]).to be false
    end
  end
end
