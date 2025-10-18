require 'rails_helper'

RSpec.describe CollectionPresenter do
  describe "#as_json" do
    it "presents each item using the specified presenter class" do
      item1 = double("item1")
      item2 = double("item2")
      collection = [ item1, item2 ]

      presenter_class = double("PresenterClass")
      presenter1 = double("presenter1", as_json: { id: 1 })
      presenter2 = double("presenter2", as_json: { id: 2 })

      allow(presenter_class).to receive(:new).with(item1, {}).and_return(presenter1)
      allow(presenter_class).to receive(:new).with(item2, {}).and_return(presenter2)

      collection_presenter = described_class.new(collection, presenter_class)
      result = collection_presenter.as_json

      expect(result).to eq([ { id: 1 }, { id: 2 } ])
    end

    it "returns empty array for empty collection" do
      collection = []
      presenter_class = double("PresenterClass")

      collection_presenter = described_class.new(collection, presenter_class)
      result = collection_presenter.as_json

      expect(result).to eq([])
    end
  end
end
