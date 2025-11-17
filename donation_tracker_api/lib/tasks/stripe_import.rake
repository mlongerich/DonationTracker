# frozen_string_literal: true

namespace :stripe do
  desc "Import Stripe donations from CSV file"
  task :import_csv, [ :file_path ] => :environment do |_task, args|
    file_path = args[:file_path] || Rails.root.join("PFAOnlinePayments-Stripe.csv")

    unless File.exist?(file_path)
      puts "❌ File not found: #{file_path}"
      exit 1
    end

    # Clear existing import data if flag is set
    if ENV["CLEAR_BEFORE_IMPORT"] == "true"
      puts "🗑️  Clearing existing import data..."
      Donation.destroy_all
      Sponsorship.destroy_all
      StripeInvoice.destroy_all
      puts "✅ Ready for fresh import"
      puts ""
    end

    puts "🚀 Starting Stripe CSV import from: #{file_path}"
    puts "=" * 80

    importer = StripeCsvBatchImporter.new(file_path)
    result = importer.import

    puts "\n"
    puts "=" * 80
    puts "✅ Import complete!"
    puts "\nSummary:"
    total_imported = result[:succeeded_count] + result[:failed_count] + result[:needs_attention_count]
    puts "  Imported Total:     #{total_imported} donations"
    puts "  - Succeeded:        #{result[:succeeded_count]} donations"
    puts "  - Failed:           #{result[:failed_count]} donations"
    puts "  - Needs Attention:  #{result[:needs_attention_count]} donations (duplicate in invoice, refunded, canceled)"
    puts "  Skipped:            #{result[:skipped_count]}"
    puts "  Errors:             #{result[:errors].size}"

    if result[:errors].size > 0
      puts "\n❌ Service Errors:"
      result[:errors].each do |error|
        puts "  Row #{error[:row]}: #{error[:message]}"
        puts "    Data: #{error[:data].inspect}" if error[:data]
      end
    end

    puts "\nTotal donations created: #{total_imported}"
    puts "=" * 80
  end
end
