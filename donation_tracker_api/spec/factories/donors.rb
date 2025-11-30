FactoryBot.define do
  factory :donor do
    sequence(:email) { |n| "donor#{n}@example.com" }
    name { Faker::Name.name }
    last_updated_at { Time.current }

    trait :with_phone do
      phone { Faker::PhoneNumber.phone_number }
    end

    trait :with_address do
      address_line1 { Faker::Address.street_address }
      address_line2 { Faker::Address.secondary_address }
      city { Faker::Address.city }
      state { Faker::Address.state_abbr }
      zip_code { Faker::Address.zip_code }
      country { "US" }
    end

    trait :with_full_contact do
      phone { Faker::PhoneNumber.phone_number }
      address_line1 { Faker::Address.street_address }
      city { Faker::Address.city }
      state { Faker::Address.state_abbr }
      zip_code { Faker::Address.zip_code }
      country { "US" }
    end
  end
end
