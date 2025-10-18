require 'rails_helper'

RSpec.describe BasePresenter do
  describe "#initialize" do
    it "stores the object" do
      object = double("object")
      presenter = described_class.new(object)

      expect(presenter.instance_variable_get(:@object)).to eq(object)
    end

    it "stores options" do
      object = double("object")
      options = { include_details: true }
      presenter = described_class.new(object, options)

      expect(presenter.instance_variable_get(:@options)).to eq(options)
    end
  end

  describe "#as_json" do
    it "raises NotImplementedError" do
      object = double("object")
      presenter = described_class.new(object)

      expect { presenter.as_json }.to raise_error(NotImplementedError, "Subclasses must implement as_json")
    end
  end
end
