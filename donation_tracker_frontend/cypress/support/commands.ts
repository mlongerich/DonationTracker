/// <reference types="cypress" />

/**
 * Custom Cypress commands for donor management tests
 */

/**
 * Clears all donors from the database (test cleanup)
 */
Cypress.Commands.add('clearDonors', () => {
  cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
});

/**
 * Creates a donor by filling out and submitting the form
 * @param name - Donor name
 * @param email - Donor email
 */
Cypress.Commands.add('createDonor', (name: string, email: string) => {
  // Use label-based selection to find the correct fields
  cy.contains('label', /^name/i).parent().find('input').clear().type(name);
  cy.contains('label', /^email/i).parent().find('input').clear().type(email);
  cy.contains('button', /submit/i).click();

  // Wait for Snackbar to appear (it's in a Portal, so need to search entire document)
  cy.get('body').contains(/donor (created|updated) successfully/i, {
    timeout: 10000,
  }).should('be.visible');
});

/**
 * Clicks the edit button on the first donor in the list
 */
Cypress.Commands.add('clickEditDonor', () => {
  cy.get('button[aria-label="edit"]').first().click();
});

/**
 * Verifies the form is pre-filled with donor data
 * @param name - Expected donor name
 * @param email - Expected donor email
 */
Cypress.Commands.add('verifyFormPreFilled', (name: string, email: string) => {
  cy.contains('label', /^name/i).parent().find('input').should('have.value', name);
  cy.contains('label', /^email/i).parent().find('input').should('have.value', email);
});

/**
 * Logs in as the seeded admin user for authenticated E2E tests
 * Fetches JWT and stores in Cypress env for use by subsequent visits
 * Call this at the start of beforeEach() before cy.visit()
 */
Cypress.Commands.add('login', () => {
  // Request JWT from dev_login endpoint
  cy.request({
    method: 'GET',
    url: `${Cypress.env('apiUrl')}/auth/dev_login`,
    followRedirect: false,
  }).then((response) => {
    // Extract token and user from redirect URL
    const redirectUrl = new URL(response.headers.location);
    const token = redirectUrl.searchParams.get('token');
    const userJson = redirectUrl.searchParams.get('user');

    // Store in Cypress env for use by cy.visit() overwrite
    Cypress.env('auth_token', token);
    Cypress.env('auth_user', userJson);
  });
});
