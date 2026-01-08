#!/usr/bin/env ruby
# frozen_string_literal: true

# Script to add auth_headers to all HTTP requests in request specs
# Usage: ruby scripts/add-auth-to-specs.rb

Dir.glob("donation_tracker_api/spec/requests/**/*_spec.rb").each do |file|
  # Skip auth_spec.rb and application_controller_spec.rb (already updated)
  next if file.include?("auth_spec.rb") || file.include?("application_controller_spec.rb")

  content = File.read(file)
  modified = false

  # Pattern 1: get "/path" or get '/path' -> add headers: auth_headers
  if content.gsub!(/(get|post|put|patch|delete) (["'])(\/[^"']+)\2(?!\s*,)/, '\1 \2\3\2, headers: auth_headers')
    modified = true
  end

  # Pattern 2: get "/path", params: {...} -> get "/path", params: {...}, headers: auth_headers
  if content.gsub!(/(get|post|put|patch|delete) (["'])(\/[^"']+)\2, params: ([^,\n]+)(?!, headers)/, '\1 \2\3\2, params: \4, headers: auth_headers')
    modified = true
  end

  # Pattern 3: headers: { "Host" => "api" } -> headers: { "Host" => "api" }.merge(auth_headers)
  if content.gsub!(/headers: \{ "Host" => "api" \}(?!\.merge)/, 'headers: { "Host" => "api" }.merge(auth_headers)')
    modified = true
  end

  if modified
    File.write(file, content)
    puts "Updated: #{file}"
  end
end

puts "Done!"
