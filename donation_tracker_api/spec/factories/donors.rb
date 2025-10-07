FactoryBot.define do
  factory :donor do
    sequence(:email) { |n| "donor#{n}@example.com" }
    name { Faker::Name.name }
    last_updated_at { Time.current }
  end
end
