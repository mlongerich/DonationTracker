# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# Create admin test user for development and testing
# This user can authenticate via Google OAuth (@projectsforasia.com domain)
User.find_or_create_by!(
  provider: "google_oauth2",
  uid: "admin_test_uid"
) do |user|
  user.email = "admin@projectsforasia.com"
  user.name = "Admin User"
  user.avatar_url = "https://via.placeholder.com/150"
end

puts "✅ Seeded admin user: admin@projectsforasia.com"
