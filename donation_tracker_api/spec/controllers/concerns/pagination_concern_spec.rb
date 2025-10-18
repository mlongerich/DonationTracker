require 'rails_helper'

RSpec.describe PaginationConcern, type: :controller do
  controller(ApplicationController) do
    include PaginationConcern

    def index
      collection = Donor.all
      paginated = paginate_collection(collection)
      render json: { data: paginated, meta: pagination_meta(paginated) }
    end
  end

  before do
    Donor.delete_all
  end

  describe "#paginate_collection" do
    it "paginates collection with default per_page of 25" do
      create_list(:donor, 30)

      get :index

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].count).to eq(25)
      expect(json['meta']['per_page']).to eq(25)
    end

    it "accepts custom per_page parameter" do
      create_list(:donor, 15)

      get :index, params: { per_page: 10 }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['data'].count).to eq(10)
      expect(json['meta']['per_page']).to eq(10)
    end

    it "accepts page parameter for navigation" do
      create_list(:donor, 25)

      get :index, params: { page: 2, per_page: 10 }

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json['meta']['current_page']).to eq(2)
      expect(json['meta']['total_count']).to eq(25)
      expect(json['meta']['total_pages']).to eq(3)
    end
  end
end
