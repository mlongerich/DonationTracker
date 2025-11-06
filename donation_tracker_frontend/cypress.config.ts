import { defineConfig } from 'cypress';

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
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
