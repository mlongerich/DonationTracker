require 'rails_helper'

RSpec.describe DonorImportService do
  describe '#import' do
    context 'with Stripe CSV format (with headers)' do
      it 'imports donors using Stripe column names' do
        csv_content = "Billing Details Name,Cust Email,Amount,Date,Other\nJohn Doe,john@example.com,25.00,2025-01-01,data"
        service = DonorImportService.new(csv_content)

        result = service.import

        expect(result[:created]).to eq(1)
        expect(result[:updated]).to eq(0)
        expect(result[:failed]).to eq(0)
        expect(Donor.count).to eq(1)

        donor = Donor.first
        expect(donor.name).to eq('John Doe')
        expect(donor.email).to eq('john@example.com')
      end

      it 'updates donor when same email appears multiple times with Stripe format' do
        csv_content = "Billing Details Name,Cust Email,Amount\nJohn Doe,john@example.com,25.00\nJohn Updated,john@example.com,30.00"
        service = DonorImportService.new(csv_content)

        result = service.import

        expect(result[:created]).to eq(1)
        expect(result[:updated]).to eq(1)
        expect(result[:failed]).to eq(0)
        expect(Donor.count).to eq(1)

        donor = Donor.first
        expect(donor.name).to eq('John Updated')
        expect(donor.email).to eq('john@example.com')
      end
    end

    context 'with Stripe CSV format (no headers)' do
      it 'imports donor from first two columns' do
        csv_content = "John Doe,john@example.com,2025-01-01,extra,data,here"
        service = DonorImportService.new(csv_content)

        result = service.import

        expect(result[:created]).to eq(1)
        expect(result[:updated]).to eq(0)
        expect(result[:failed]).to eq(0)
        expect(Donor.count).to eq(1)

        donor = Donor.first
        expect(donor.name).to eq('John Doe')
        expect(donor.email).to eq('john@example.com')
      end

      it 'imports multiple donors ignoring extra columns' do
        csv_content = <<~CSV
          Alice Johnson,alice@example.com,2025-01-01,ch_123,payment,data
          Bob Smith,bob@example.com,2025-01-02,ch_456,more,payment,stuff
        CSV

        service = DonorImportService.new(csv_content)
        result = service.import

        expect(result[:created]).to eq(2)
        expect(result[:updated]).to eq(0)
        expect(result[:failed]).to eq(0)
        expect(Donor.count).to eq(2)

        expect(Donor.find_by(email: 'alice@example.com').name).to eq('Alice Johnson')
        expect(Donor.find_by(email: 'bob@example.com').name).to eq('Bob Smith')
      end
    end

    context 'with legacy format (headers)' do
      it 'imports a single donor from valid CSV' do
        csv_content = "name,email\nJohn Doe,john@example.com"
        service = DonorImportService.new(csv_content)

        result = service.import

        expect(result[:created]).to eq(1)
        expect(result[:updated]).to eq(0)
        expect(result[:failed]).to eq(0)
        expect(Donor.count).to eq(1)

        donor = Donor.first
        expect(donor.name).to eq('John Doe')
        expect(donor.email).to eq('john@example.com')
      end
    end

    it 'updates existing donor when email matches' do
      create(:donor, name: 'Old Name', email: 'john@example.com')

      csv_content = "name,email\nJohn Doe,john@example.com"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(0)
      expect(result[:updated]).to eq(1)
      expect(result[:failed]).to eq(0)
      expect(Donor.count).to eq(1)

      donor = Donor.first
      expect(donor.name).to eq('John Doe')
      expect(donor.email).to eq('john@example.com')
    end

    it 'uses default "Anonymous" when name is blank' do
      csv_content = "name,email\n,blank_name@example.com"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(1)
      expect(result[:updated]).to eq(0)
      expect(result[:failed]).to eq(0)
      expect(Donor.count).to eq(1)

      donor = Donor.first
      expect(donor.name).to eq('Anonymous')
      expect(donor.email).to eq('blank_name@example.com')
    end

    it 'generates email from name when email is blank' do
      csv_content = "name,email\nJohn Doe,"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(1)
      expect(result[:updated]).to eq(0)
      expect(result[:failed]).to eq(0)
      expect(Donor.count).to eq(1)

      donor = Donor.first
      expect(donor.name).to eq('John Doe')
      expect(donor.email).to eq('JohnDoe@mailinator.com')
    end

    it 'handles validation errors and continues processing' do
      csv_content = "name,email\nValid Donor,valid@example.com\nInvalid,not-an-email\nAnother Valid,another@example.com"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(2)
      expect(result[:updated]).to eq(0)
      expect(result[:failed]).to eq(1)
      expect(result[:errors].length).to eq(1)
      expect(result[:errors].first[:row]).to eq(3)
      expect(result[:errors].first[:message]).to include('Email')
      expect(Donor.count).to eq(2)
    end

    it 'updates donor when same email appears multiple times in CSV' do
      csv_content = "name,email\nJohn Doe,john@example.com\nJohn Updated,john@example.com"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(1)
      expect(result[:updated]).to eq(1)
      expect(result[:failed]).to eq(0)
      expect(Donor.count).to eq(1)

      donor = Donor.first
      expect(donor.name).to eq('John Updated')
      expect(donor.email).to eq('john@example.com')
    end

    it 'handles case-insensitive email matching' do
      csv_content = "name,email\nJohn Doe,john@example.com\nJohn Updated,JOHN@EXAMPLE.COM"
      service = DonorImportService.new(csv_content)

      result = service.import

      expect(result[:created]).to eq(1)
      expect(result[:updated]).to eq(1)
      expect(result[:failed]).to eq(0)
      expect(Donor.count).to eq(1)

      donor = Donor.first
      expect(donor.name).to eq('John Updated')
    end
  end
end
