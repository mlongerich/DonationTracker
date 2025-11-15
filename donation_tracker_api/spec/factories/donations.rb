FactoryBot.define do
  factory :donation do
    amount { Faker::Number.decimal(l_digits: 2, r_digits: 2) }
    date { Date.today }
    payment_method { :check }
    status { :succeeded }
    association :donor

    trait :stripe do
      payment_method { :stripe }
    end

    trait :succeeded do
      status { :succeeded }
    end

    trait :failed do
      status { :failed }
    end

    trait :refunded do
      status { :refunded }
    end

    trait :canceled do
      status { :canceled }
    end

    trait :needs_attention do
      status { :needs_attention }
      duplicate_subscription_detected { true }
      needs_attention_reason { "Duplicate subscription detected" }
    end
  end
end
