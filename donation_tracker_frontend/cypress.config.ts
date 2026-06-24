import { defineConfig } from 'cypress';
import { execSync } from 'child_process';
import * as path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      // Default to test API for E2E tests (isolated test database)
      apiUrl: 'http://localhost:3002',
      // Legacy environment variables (for backwards compatibility)
      devApiUrl: 'http://localhost:3001',
      testApiUrl: 'http://localhost:3002',
    },
    setupNodeEvents(on, _config) {
      on('task', {
        'db:clean': () => {
          const repoRoot = path.resolve(__dirname, '..');
          execSync('docker-compose exec -T api bundle exec rake test:cleanup', { cwd: repoRoot });
          return null;
        },
      });
    },
  },
});
