# frozen_string_literal: true

require "rails_helper"
require "rake"

RSpec.describe "stripe:import_csv rake task" do
  before(:all) do
    Rails.application.load_tasks
  end

  let(:csv_file_path) { Rails.root.join("tmp", "test_stripe_rake.csv") }

  before do
    FileUtils.mkdir_p(Rails.root.join("tmp"))
  end

  after do
    File.delete(csv_file_path) if File.exist?(csv_file_path)
    Rake::Task["stripe:import_csv"].reenable
  end

  describe "stripe:import_csv" do
    context "with valid CSV file" do
      before do
        csv_content = <<~CSV
          Amount,Billing Details Name,Cust Email,Created Formatted,Description,Transaction ID,Cust ID,Cust Subscription Data ID,Status,Cust Subscription Data Plan Nickname
          100,John Doe,john@example.com,2020-06-15 00:56:17 +0000,Invoice ABC123,txn_rake_001,cus_001,sub_001,succeeded,$100 - General Monthly Donation
        CSV
        File.write(csv_file_path, csv_content)
      end

      it "imports the CSV successfully" do
        expect {
          Rake::Task["stripe:import_csv"].invoke(csv_file_path)
        }.to change(Donation, :count).by(1)
      end
    end

    context "with nonexistent file" do
      it "exits with error message" do
        expect {
          Rake::Task["stripe:import_csv"].invoke("nonexistent.csv")
        }.to raise_error(SystemExit)
      end
    end

    context "with no arguments" do
      it "uses default file path" do
        default_path = Rails.root.join("PFAOnlinePayments-Stripe.csv")

        allow(File).to receive(:exist?).and_call_original
        allow(File).to receive(:exist?).with(default_path).and_return(true)
        allow(StripeCsvBatchImporter).to receive(:new).with(default_path).and_call_original
        allow_any_instance_of(StripeCsvBatchImporter).to receive(:import).and_return({
          succeeded_count: 0,
          failed_count: 0,
          needs_attention_count: 0,
          skipped_count: 0,
          errors: []
        })

        Rake::Task["stripe:import_csv"].invoke

        expect(StripeCsvBatchImporter).to have_received(:new).with(default_path)
      end
    end
  end
end
