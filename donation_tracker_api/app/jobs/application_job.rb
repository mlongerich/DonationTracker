# frozen_string_literal: true

# Base class for all background jobs in the application.
#
# All jobs inherit from this class to establish common behavior
# for retry and error handling policies.
#
# Configured retry policies (commented out, enable as needed):
# - retry_on ActiveRecord::Deadlocked (database deadlock retries)
# - discard_on ActiveJob::DeserializationError (ignore deleted records)
#
# @see ActiveJob::Base for inherited functionality
# @example Create a background job
#   class SendEmailJob < ApplicationJob
#     queue_as :default
#
#     def perform(user_id)
#       # Job logic here
#     end
#   end
class ApplicationJob < ActiveJob::Base
  # Automatically retry jobs that encountered a deadlock
  # retry_on ActiveRecord::Deadlocked

  # Most jobs are safe to ignore if the underlying records are no longer available
  # discard_on ActiveJob::DeserializationError
end
