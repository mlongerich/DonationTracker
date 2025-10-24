Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    resources :donors, only: [ :create, :show, :index, :update, :destroy ] do
      delete "all", action: :destroy_all, on: :collection
      post "merge", action: :merge, on: :collection
      post "restore", action: :restore, on: :member
    end

    resources :donations, only: [ :index, :create, :show ]

    resources :projects, only: [ :index, :show, :create, :update, :destroy ]

    resources :children, only: [ :index, :show, :create, :update, :destroy ] do
      post "restore", action: :restore, on: :member
      resources :sponsorships, only: [ :index ]
    end

    resources :sponsorships, only: [ :index, :create, :destroy ]

    # Test-only routes (development/test environments only)
    namespace :test do
      delete "cleanup", action: :cleanup
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
