# frozen_string_literal: true

# Base class for all Active Record models in the application.
#
# All models inherit from this class to establish the primary abstract
# class pattern for Rails applications.
#
# @see ActiveRecord::Base for inherited functionality
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
