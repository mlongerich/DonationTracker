describe('Donor Archive & Restore', () => {
  beforeEach(() => {
    // Redirect all API calls from dev to test database
    cy.intercept(`${Cypress.env('devApiUrl')}/api/**`, (req) => {
      req.url = req.url.replace(Cypress.env('devApiUrl'), Cypress.env('testApiUrl'));
    });

    cy.clearDonors();
    cy.visit('/');
    // Wait for page to fully load
    cy.contains('Donation Tracker').should('be.visible');
    cy.contains('Add Donor').should('be.visible');
  });

  it('archives a donor and hides it from the list', () => {
    // Create a donor
    cy.createDonor('John Doe', 'john@example.com');

    // Verify donor is visible
    cy.contains('Donors (1)').should('be.visible');
    cy.contains('John Doe').should('be.visible');

    // Click archive button
    cy.get('[data-testid="donor-row"]').find('[aria-label="archive"]').click();

    // Wait for API call to complete
    cy.wait(500);

    // Donor should be hidden
    cy.contains('John Doe').should('not.exist');
    cy.contains('Donors (0)').should('be.visible');
  });
});
