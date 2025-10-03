describe('Donor Form', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('user can create donor and see success alert', () => {
    // Fill out the form by finding input fields
    cy.get('input[type="text"]').first().type('John Doe');
    cy.get('input[type="email"]').type('john@example.com');

    // Submit the form
    cy.contains('button', /submit/i).click();

    // Verify success message appears (created or updated)
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Verify success alert has correct styling (green)
    cy.contains(/donor (created|updated) successfully/i)
      .parent()
      .should('have.class', 'MuiAlert-standardSuccess');
  });

  it('displays the donor form with all required fields', () => {
    cy.contains('Donation Tracker').should('be.visible');
    cy.contains('Add Donor').should('be.visible');
    cy.contains('label', /name/i).should('be.visible');
    cy.contains('label', /email/i).should('be.visible');
    cy.contains('button', /submit/i).should('be.visible');
  });

  it('displays created donor in the donor list', () => {
    // Fill out and submit the form
    cy.get('input[type="text"]').first().type('Jane Smith');
    cy.get('input[type="email"]').type('jane@example.com');
    cy.contains('button', /submit/i).click();

    // Wait for success message
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Verify donor appears in the list
    cy.contains('Donors').should('be.visible');
    cy.contains('Jane Smith').should('be.visible');
    cy.contains('jane@example.com').should('be.visible');
  });
});
