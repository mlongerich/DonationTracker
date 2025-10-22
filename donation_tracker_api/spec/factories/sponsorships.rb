FactoryBot.define do
  factory :sponsorship do
    association :donor
    association :child
    association :project
    monthly_amount { 50.00 }
    end_date { nil }
  end
end
