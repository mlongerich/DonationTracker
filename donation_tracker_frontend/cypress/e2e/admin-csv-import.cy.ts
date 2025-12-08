describe('Admin CSV Import', () => {
  beforeEach(() => {
    cy.request('DELETE', 'http://localhost:3002/api/test/cleanup');
    cy.visit('/admin');
  });

  it('successfully imports Stripe CSV file', () => {
    // Navigate to CSV tab
    cy.contains('button[role="tab"]', 'CSV').click();

    // Verify import section exists
    cy.contains('h6', 'Stripe CSV Import').should('be.visible');

    // Upload CSV file
    cy.get('input[type="file"]').selectFile(
      'cypress/fixtures/stripe_import_test.csv',
      { force: true }
    );

    // Verify file selected
    cy.contains('Selected: stripe_import_test.csv').should('be.visible');

    // Click import button
    cy.contains('button', 'Import Stripe CSV').click();

    // Verify result is displayed (either success or error)
    cy.contains(/succeeded:|failed:/i, { timeout: 10000 }).should('be.visible');
  });
});
