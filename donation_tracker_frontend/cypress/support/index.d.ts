/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Clears all donors from the database (test cleanup)
     * @example cy.clearDonors()
     */
    clearDonors(): Chainable<void>;

    /**
     * Creates a donor by filling out and submitting the form
     * @param name - Donor name
     * @param email - Donor email
     * @example cy.createDonor('John Doe', 'john@example.com')
     */
    createDonor(name: string, email: string): Chainable<void>;

    /**
     * Clicks the edit button on the first donor in the list
     * @example cy.clickEditDonor()
     */
    clickEditDonor(): Chainable<void>;

    /**
     * Verifies the form is pre-filled with donor data
     * @param name - Expected donor name
     * @param email - Expected donor email
     * @example cy.verifyFormPreFilled('Jane Smith', 'jane@example.com')
     */
    verifyFormPreFilled(name: string, email: string): Chainable<void>;

    /**
     * Logs in as the seeded admin user for authenticated E2E tests
     * Sets auth_token and auth_user in localStorage
     * Call this before cy.visit() to authenticate the session
     * @example cy.login()
     */
    login(): Chainable<void>;
  }
}
