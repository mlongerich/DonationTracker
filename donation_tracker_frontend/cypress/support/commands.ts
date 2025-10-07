/// <reference types="cypress" />

/**
 * Custom Cypress commands for donor management tests
 */

/**
 * Clears all donors from the database (test cleanup)
 */
Cypress.Commands.add('clearDonors', () => {
  cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/donors/all`);
});

/**
 * Creates a donor by filling out and submitting the form
 * @param name - Donor name
 * @param email - Donor email
 */
Cypress.Commands.add('createDonor', (name: string, email: string) => {
  cy.get('input[type="text"]').first().type(name);
  cy.get('input[type="email"]').type(email);
  cy.contains('button', /submit/i).click();
  cy.contains(/donor (created|updated) successfully/i, {
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
  cy.get('input[type="text"]').first().should('have.value', name);
  cy.get('input[type="email"]').should('have.value', email);
});
