# frozen_string_literal: true

namespace :stripe do
  desc "Import Stripe donations from CSV file"
  task :import_csv, [ :file_path ] => :environment do |_task, args|
    file_path = args[:file_path] || Rails.root.join("PFAOnlinePayments-Stripe.csv")

    unless File.exist?(file_path)
      puts "❌ File not found: #{file_path}"
      exit 1
    end

    puts "🚀 Starting Stripe CSV import from: #{file_path}"
    puts "=" * 80

    importer = StripeCsvBatchImporter.new(file_path)
    result = importer.import

    puts "\n"
    puts "=" * 80
    puts "✅ Import complete!"
    puts "\nSummary:"
    puts "  Imported: #{result[:imported_count]} donations"
    puts "  Skipped:  #{result[:skipped_count]} (already imported or non-succeeded)"
    puts "  Failed:   #{result[:failed_count]}"

    if result[:failed_count] > 0
      puts "\n❌ Failed Rows:"
      result[:errors].each do |error|
        puts "  Row #{error[:row]}: #{error[:message]}"
        puts "    Data: #{error[:data].inspect}" if error[:data]
      end
    end

    puts "\nDonations created: #{result[:imported_count]}"
    puts "=" * 80
  end
end
