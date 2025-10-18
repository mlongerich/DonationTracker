require 'rails_helper'

RSpec.describe RansackFilterable, type: :controller do
  controller(ApplicationController) do
    include RansackFilterable

    def index
      scope = Donor.all
      filtered = apply_ransack_filters(scope)
      render json: { donors: filtered }
    end
  end

  before do
    Donor.delete_all
  end

  describe "#apply_ransack_filters" do
    it "returns unfiltered scope when no q param provided" do
      donor1 = create(:donor, name: "Alice")
      donor2 = create(:donor, name: "Bob")

      get :index

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['donors'].map { |d| d['id'] }).to contain_exactly(donor1.id, donor2.id)
    end

    it "filters scope using Ransack when q param provided" do
      alice = create(:donor, name: "Alice Smith")
      _bob = create(:donor, name: "Bob Jones")

      get :index, params: { q: { name_cont: "Alice" } }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['donors'].count).to eq(1)
      expect(json['donors'].first['id']).to eq(alice.id)
    end
  end
end
