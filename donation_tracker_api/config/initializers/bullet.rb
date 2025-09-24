if defined?(Bullet) && Rails.env.development?
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
  Bullet.rails_logger = true

  # Add these for more detailed feedback
  Bullet.add_footer = true
  Bullet.skip_html_injection = false

  # Detect N+1 queries
  Bullet.n_plus_one_query_enable = true

  # Detect unused eager loading
  Bullet.unused_eager_loading_enable = true

  # Detect missing counter cache
  Bullet.counter_cache_enable = true
end