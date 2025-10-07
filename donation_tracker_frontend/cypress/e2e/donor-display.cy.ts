describe('Donor Email Display', () => {
  beforeEach(() => {
    cy.intercept(`${Cypress.env('devApiUrl')}/api/**`, (req) => {
      req.url = req.url.replace(
        Cypress.env('devApiUrl'),
        Cypress.env('testApiUrl')
      );
    });

    cy.clearDonors();
    cy.visit('/');
    cy.contains('Donation Tracker').should('be.visible');
  });

  it('hides auto-generated @mailinator.com emails in list view', () => {
    // Create donor with blank email (backend generates @mailinator.com)
    cy.get('input[type="text"]').first().type('Anonymous Donor');
    cy.get('input[type="email"]').clear();
    cy.contains('button', /submit/i).click();

    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Verify name is shown
    cy.contains('Anonymous Donor').should('be.visible');

    // Verify @mailinator.com email is hidden
    cy.contains('@mailinator.com').should('not.exist');

    // Verify placeholder text is shown
    cy.contains('(No email provided)').should('be.visible');
  });
});
