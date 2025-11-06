# frozen_string_literal: true

# Base class for all mailers in the application.
#
# All mailers inherit from this class to establish common behavior
# for email sending (default from address, layout).
#
# Default configuration:
# - from: "from@example.com"
# - layout: "mailer"
#
# @see ActionMailer::Base for inherited functionality
# @example Create a mailer
#   class UserMailer < ApplicationMailer
#     def welcome_email(user)
#       @user = user
#       mail(to: @user.email, subject: 'Welcome!')
#     end
#   end
class ApplicationMailer < ActionMailer::Base
  default from: "from@example.com"
  layout "mailer"
end
