// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Global cleanup after each test to prevent leaks between tests
afterEach(() => {
  // Clean up React components
  cleanup();

  // Clear document.body (removes MUI modal portals that persist between tests)
  document.body.innerHTML = '';

  // Clear any pending timers (from debounced autocomplete, etc.)
  jest.clearAllTimers();
});
