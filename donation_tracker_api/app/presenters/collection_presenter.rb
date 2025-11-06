# frozen_string_literal: true

# Formats collections of objects using their individual presenters.
#
# This presenter provides a consistent way to format arrays of model
# objects by delegating to their individual presenter classes.
#
# @example Format a collection of donors
#   donors = Donor.all
#   CollectionPresenter.new(donors, DonorPresenter).as_json
#   # => [{ id: 1, name: "John" }, { id: 2, name: "Jane" }]
#
# @see BasePresenter for base presenter interface
class CollectionPresenter < BasePresenter
  def initialize(collection, presenter_class, options = {})
    @collection = collection
    @presenter_class = presenter_class
    @options = options
  end

  def as_json(options = {})
    @collection.map do |item|
      @presenter_class.new(item).as_json(@options.merge(options))
    end
  end
end
