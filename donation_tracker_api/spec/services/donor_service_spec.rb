require 'rails_helper'

RSpec.describe DonorService, type: :service do
  describe "#find_or_update" do
    before do
      Donor.delete_all
      Donation.delete_all
    end

    context "when email lookup (no stripe_customer_id)" do
      it "creates new donor when email not found" do
        donor_attrs = { name: "John Doe", email: "john@example.com" }
        transaction_date = Time.current

        service = DonorService.new(
          donor_attributes: donor_attrs,
          transaction_date: transaction_date
        )
        result = service.find_or_update

        expect(result[:created]).to be true
        expect(result[:donor]).to be_persisted
        expect(result[:donor].name).to eq("John Doe")
        expect(result[:donor].email).to eq("john@example.com")
      end

      it "updates donor name when newer record has a name" do
        existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.week.ago)
        newer_data = { name: "John Johnson", email: "john@example.com" }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].name).to eq("John Johnson")
      end

      it "preserves existing name when newer record has blank name" do
        existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.week.ago)
        newer_data = { name: "", email: "john@example.com" }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].name).to eq("John Smith")  # Preserved!
      end

      it "does not update when existing data is newer" do
        existing = Donor.create!(name: "John Smith", email: "john@example.com", last_updated_at: 1.day.ago)
        older_data = { name: "John Johnson", email: "john@example.com" }

        service = DonorService.new(
          donor_attributes: older_data,
          transaction_date: 1.week.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].name).to eq("John Smith")  # Unchanged
      end

      it "handles submitting blank name and blank email multiple times" do
        # First submission with blank name and blank email
        first_service = DonorService.new(
          donor_attributes: { name: "", email: "" },
          transaction_date: Time.current
        )
        first_result = first_service.find_or_update

        expect(first_result[:created]).to be true
        expect(first_result[:donor].name).to eq("Anonymous")
        expect(first_result[:donor].email).to eq("Anonymous@mailinator.com")

        first_donor_id = first_result[:donor].id

        # Second submission with blank name and blank email (should update same donor)
        second_service = DonorService.new(
          donor_attributes: { name: "", email: "" },
          transaction_date: Time.current + 1.hour
        )
        second_result = second_service.find_or_update

        expect(second_result[:created]).to be false
        expect(second_result[:donor].id).to eq(first_donor_id)
        expect(second_result[:donor].name).to eq("Anonymous")
        expect(second_result[:donor].email).to eq("Anonymous@mailinator.com")
      end

      it "preserves existing phone when newer record has blank phone" do
        existing = Donor.create!(name: "John Smith", email: "john@example.com", phone: "5551234567", last_updated_at: 1.week.ago)
        newer_data = { name: "John Smith", email: "john@example.com", phone: "" }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].phone).to eq("5551234567")  # Preserved!
      end

      it "updates phone when newer record has non-blank phone" do
        existing = Donor.create!(name: "John Smith", email: "john@example.com", phone: "5551234567", last_updated_at: 1.week.ago)
        newer_data = { name: "John Smith", email: "john@example.com", phone: "5559999999" }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].phone).to eq("5559999999")  # Updated!
      end

      it "preserves existing address when newer record has blank address fields" do
        existing = Donor.create!(
          name: "John Smith",
          email: "john@example.com",
          address_line1: "123 Main St",
          city: "Springfield",
          state: "IL",
          zip_code: "62701",
          country: "US",
          last_updated_at: 1.week.ago
        )
        newer_data = {
          name: "John Smith",
          email: "john@example.com",
          address_line1: "",
          city: "",
          state: "",
          zip_code: "",
          country: ""
        }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].address_line1).to eq("123 Main St")  # Preserved!
        expect(result[:donor].city).to eq("Springfield")
        expect(result[:donor].state).to eq("IL")
        expect(result[:donor].zip_code).to eq("62701")
        expect(result[:donor].country).to eq("US")
      end

      it "updates address when newer record has non-blank address fields" do
        existing = Donor.create!(
          name: "John Smith",
          email: "john@example.com",
          address_line1: "123 Main St",
          city: "Springfield",
          state: "IL",
          zip_code: "62701",
          country: "US",
          last_updated_at: 1.week.ago
        )
        newer_data = {
          name: "John Smith",
          email: "john@example.com",
          address_line1: "456 Oak Ave",
          city: "Chicago",
          state: "IL",
          zip_code: "60601",
          country: "US"
        }

        service = DonorService.new(
          donor_attributes: newer_data,
          transaction_date: 1.day.ago
        )
        result = service.find_or_update

        expect(result[:created]).to be false
        expect(result[:donor].id).to eq(existing.id)
        expect(result[:donor].address_line1).to eq("456 Oak Ave")  # Updated!
        expect(result[:donor].city).to eq("Chicago")
        expect(result[:donor].state).to eq("IL")
        expect(result[:donor].zip_code).to eq("60601")
        expect(result[:donor].country).to eq("US")
      end
    end

    context "when stripe_customer_id lookup" do
      it "finds donor by stripe_customer_id ignoring different email" do
        # Create donor with donation that has stripe_customer_id
        donor = create(:donor, name: "John Doe", email: "john@example.com")
        project = create(:project)
        create(:donation, :stripe,
          donor: donor,
          project: project,
          amount: 10000,
          stripe_customer_id: "cus_123"
        )

        # Try to find with same stripe_customer_id but different email
        service = DonorService.new(
          donor_attributes: { name: "Different Name", email: "different@example.com" },
          transaction_date: Time.current,
          stripe_customer_id: "cus_123"
        )
        result = service.find_or_update

        # Should return existing donor (found by stripe_customer_id)
        expect(result[:donor].id).to eq(donor.id)
        expect(result[:created]).to be false
        expect(result[:donor].email).to eq("john@example.com")  # Original email preserved
      end

      it "follows merge chain when donor was merged" do
        # Create original donor with donation
        donor1 = create(:donor, name: "John Doe", email: "john@example.com")
        project = create(:project)
        create(:donation, :stripe,
          donor: donor1,
          project: project,
          amount: 10000,
          stripe_customer_id: "cus_123"
        )

        # Create merged donor
        donor2 = create(:donor, name: "John Doe", email: "john.doe@example.com")

        # Simulate merge: donor1 was merged into donor2
        donor1.update_column(:merged_into_id, donor2.id)
        donor1.discard

        # Try to find with stripe_customer_id
        service = DonorService.new(
          donor_attributes: { name: "John Doe", email: "john@example.com" },
          transaction_date: Time.current,
          stripe_customer_id: "cus_123"
        )
        result = service.find_or_update

        # Should return merged donor (donor2), not original (donor1)
        expect(result[:donor].id).to eq(donor2.id)
        expect(result[:redirected]).to be true
        expect(result[:created]).to be false
      end

      it "follows multi-level merge chain (A→B→C)" do
        # Create donor chain: A → B → C
        donor_a = create(:donor, name: "Donor A", email: "a@example.com")
        donor_b = create(:donor, name: "Donor B", email: "b@example.com")
        donor_c = create(:donor, name: "Donor C", email: "c@example.com")

        project = create(:project)
        create(:donation, :stripe,
          donor: donor_a,
          project: project,
          amount: 10000,
          stripe_customer_id: "cus_multi"
        )

        # Simulate multi-level merge: A → B, then B → C
        donor_a.update_column(:merged_into_id, donor_b.id)
        donor_a.discard
        donor_b.update_column(:merged_into_id, donor_c.id)
        donor_b.discard

        # Try to find with stripe_customer_id
        service = DonorService.new(
          donor_attributes: { name: "Donor A", email: "a@example.com" },
          transaction_date: Time.current,
          stripe_customer_id: "cus_multi"
        )
        result = service.find_or_update

        # Should return final donor in chain (donor_c)
        expect(result[:donor].id).to eq(donor_c.id)
        expect(result[:redirected]).to be true
      end

      it "falls back to email lookup when stripe_customer_id not found" do
        # Create donor without any stripe donations
        existing_donor = Donor.create!(name: "Jane Doe", email: "jane@example.com", last_updated_at: 1.week.ago)

        # Call with nil stripe_customer_id, should use email
        service = DonorService.new(
          donor_attributes: { name: "Jane Doe", email: "jane@example.com" },
          transaction_date: Time.current,
          stripe_customer_id: nil
        )
        result = service.find_or_update

        # Should find by email
        expect(result[:donor].id).to eq(existing_donor.id)
        expect(result[:created]).to be false
      end
    end
  end
end
