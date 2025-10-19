FactoryBot.define do
  factory :project do
    sequence(:title) { |n| "Project #{n}" }
    description { Faker::Lorem.paragraph }
    project_type { :general }
    system { false }
  end
end
