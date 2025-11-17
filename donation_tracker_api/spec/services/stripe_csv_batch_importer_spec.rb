# frozen_string_literal: true

require "rails_helper"

RSpec.describe StripeCsvBatchImporter do
  describe "#import" do
    let(:csv_file_path) { Rails.root.join("tmp", "test_stripe_import.csv") }
    let(:importer) { described_class.new(csv_file_path) }

    before do
      # Ensure tmp directory exists
      FileUtils.mkdir_p(Rails.root.join("tmp"))
    end

    after do
      # Cleanup test CSV file
      File.delete(csv_file_path) if File.exist?(csv_file_path)
    end

    context "with valid CSV containing one succeeded transaction" do
      before do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          100,John Doe,john@example.com,2020-06-15 00:56:17 +0000,Invoice ABC123,txn_001,cus_001,sub_001,succeeded,$100 - General Monthly Donation
        CSV
        File.write(csv_file_path, csv_content)
      end

      it "imports the transaction successfully" do
        result = importer.import

        expect(result[:succeeded_count]).to eq(1)
      end
    end


    context "with failed transaction" do
      before do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          invalid,,john@example.com,2020-06-15 00:56:17 +0000,Invoice ABC123,txn_003,cus_003,sub_003,succeeded,$100 - General Monthly Donation
        CSV
        File.write(csv_file_path, csv_content)
      end

      it "tracks service errors" do
        result = importer.import

        expect(result[:errors].size).to eq(1)
      end

      it "collects error details with row number" do
        result = importer.import

        expect(result[:errors].size).to eq(1)
        expect(result[:errors].first[:row]).to eq(2) # Row 2 (accounting for header)
        expect(result[:errors].first[:message]).to be_present
      end

      it "sanitizes row data in error report" do
        result = importer.import

        error_data = result[:errors].first[:data]
        expect(error_data).to include(:amount, :name, :email, :description, :status)
      end
    end

    context "with mix of valid, invalid, and valid transactions" do
      before do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          100,Valid Donor,valid@example.com,2020-06-15 00:56:17 +0000,Invoice ABC,txn_valid_1,cus_001,sub_001,succeeded,$100 - General Monthly Donation
          invalid,,invalid@example.com,2020-06-16 00:56:17 +0000,Invoice DEF,txn_invalid,cus_002,sub_002,succeeded,$50 - General Monthly Donation
          50,Another Valid,another@example.com,2020-06-17 00:56:17 +0000,Invoice GHI,txn_valid_2,cus_003,sub_003,succeeded,$50 - General Monthly Donation
        CSV
        File.write(csv_file_path, csv_content)
      end

      it "continues processing after row failure" do
        result = importer.import

        expect(result[:succeeded_count]).to eq(2)
        expect(result[:errors].size).to eq(1)
      end
    end

    context "with multi-child sponsorship (separate CSV rows, same Transaction ID)" do
      before do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          100,Multi Sponsor,multi@example.com,2020-06-15 00:56:17 +0000,Invoice XYZ,txn_multi,cus_multi,sub_multi,succeeded,Monthly Sponsorship Donation for Wan
          100,Multi Sponsor,multi@example.com,2020-06-15 00:56:17 +0000,Invoice XYZ,txn_multi,cus_multi,sub_multi,succeeded,Monthly Sponsorship Donation for Orawan
        CSV
        File.write(csv_file_path, csv_content)
      end

      it "counts multiple donations from two rows" do
        result = importer.import

        expect(result[:succeeded_count]).to eq(2)
        expect(result[:skipped_count]).to eq(0)
      end
    end

    context "with malformed CSV" do
      before do
        # Missing closing quote
        csv_content = "Amount,Name\n100,\"Unclosed quote"
        File.write(csv_file_path, csv_content)
      end

      it "handles CSV parsing errors gracefully" do
        result = importer.import

        expect(result[:errors].size).to eq(1)
        expect(result[:errors].first[:message]).to include("CSV parsing error")
      end
    end

    context "with status-based counting" do
      it "tracks succeeded donations separately from failed donations" do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          100,Succeeded Donor,succeeded@example.com,2020-06-15 00:56:17 +0000,Invoice ABC,txn_succeeded,cus_001,sub_001,succeeded,$100 - General Monthly Donation
          50,Failed Donor,failed@example.com,2020-06-16 00:56:17 +0000,Invoice DEF,txn_failed,cus_002,sub_002,failed,$50 - General Monthly Donation
        CSV
        File.write(csv_file_path, csv_content)

        result = importer.import

        # Should track status-based counts separately
        expect(result[:succeeded_count]).to eq(1)
        expect(result[:failed_count]).to eq(1)
        expect(result[:needs_attention_count]).to eq(0)

        # Old imported_count should be removed
        expect(result).not_to have_key(:imported_count)
      end
    end
  end
end
