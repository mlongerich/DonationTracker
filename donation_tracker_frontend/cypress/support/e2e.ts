// Cypress support file for E2E tests
// Import commands.ts using ES2015 syntax:
import './commands';

// Intercept all page visits to set API URL to test environment
// This ensures frontend makes API calls to localhost:3002 (isolated test database)
// instead of localhost:3001 (development database)
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const newOptions = {
    ...options,
    onBeforeLoad(win: Cypress.AUTWindow) {
      // Set test API URL before page loads
      (win as any).REACT_APP_API_URL = Cypress.env('apiUrl'); // http://localhost:3002

      // Set authentication data in localStorage if available (from cy.login())
      const authToken = Cypress.env('auth_token');
      const authUser = Cypress.env('auth_user');
      if (authToken && authUser) {
        win.localStorage.setItem('auth_token', authToken);
        win.localStorage.setItem('auth_user', authUser);
      }

      // Call original onBeforeLoad if it exists
      if (options && options.onBeforeLoad) {
        options.onBeforeLoad(win);
      }
    },
  };

  // @ts-ignore - Cypress overwrite signature is complex
  return originalFn(url, newOptions);
});
