FactoryBot.define do
  factory :donation do
    amount { Faker::Number.decimal(l_digits: 2, r_digits: 2) }
    date { Date.today }
    payment_method { :check }
    association :donor

    trait :stripe do
      payment_method { :stripe }
    end
  end
end
