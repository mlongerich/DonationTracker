namespace :donors do
  desc "Import donors from CSV file (usage: rake donors:import[path/to/file.csv])"
  task :import, [ :file_path ] => :environment do |_t, args|
    unless args[:file_path]
      puts "Error: File path required"
      puts "Usage: rake donors:import[path/to/file.csv]"
      exit 1
    end

    file_path = args[:file_path]

    unless File.exist?(file_path)
      puts "Error: File not found: #{file_path}"
      exit 1
    end

    puts "Importing donors from: #{file_path}"
    puts "-" * 50

    csv_content = File.read(file_path)
    service = DonorImportService.new(csv_content)
    result = service.import

    puts "\nImport Summary:"
    puts "  Created: #{result[:created]}"
    puts "  Updated: #{result[:updated]}"
    puts "  Failed:  #{result[:failed]}"

    if result[:errors].any?
      puts "\nErrors:"
      result[:errors].each do |error|
        puts "  Row #{error[:row]}: #{error[:message]}"
      end
    end

    puts "-" * 50
    puts "Import complete!"
  end
end
