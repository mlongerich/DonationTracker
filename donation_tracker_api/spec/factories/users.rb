FactoryBot.define do
  factory :user do
    provider { 'google_oauth2' }
    sequence(:uid) { |n| "google_uid_#{n}" }
    sequence(:email) { |n| "user#{n}@projectsforasia.com" }
    name { 'Test User' }
    avatar_url { 'https://example.com/avatar.jpg' }

    trait :admin do
      email { 'admin@projectsforasia.com' }
      name { 'Admin User' }
    end

    trait :unauthorized_domain do
      email { 'unauthorized@gmail.com' }
    end
  end
end
