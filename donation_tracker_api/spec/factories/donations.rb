FactoryBot.define do
  factory :donation do
    amount { Faker::Number.decimal(l_digits: 2, r_digits: 2) }
    date { Date.today }
    association :donor
  end
end
