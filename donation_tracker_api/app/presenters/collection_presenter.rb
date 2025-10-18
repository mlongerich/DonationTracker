class CollectionPresenter < BasePresenter
  def initialize(collection, presenter_class, options = {})
    @collection = collection
    @presenter_class = presenter_class
    @options = options
  end

  def as_json(options = {})
    @collection.map do |item|
      @presenter_class.new(item, @options).as_json(options)
    end
  end
end
