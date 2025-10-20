describe('Navigation', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
  });

  it('navigates between pages', () => {
    cy.visit('http://localhost:3000');

    // Should show donations page at root (index route)
    cy.url().should('eq', 'http://localhost:3000/');
    cy.contains('Donation Management').should('be.visible');

    // Navigate to donors page
    cy.contains('a', 'Donors').click();
    cy.url().should('include', '/donors');
    cy.contains('Donor Management').should('be.visible');

    // Navigate to projects page
    cy.contains('a', 'Projects').click();
    cy.url().should('include', '/projects');
    cy.contains('Manage Projects').should('be.visible');

    // Navigate back to donations
    cy.contains('a', 'Donations').click();
    cy.url().should('include', '/donations');
    cy.contains('Donation Management').should('be.visible');
  });
});
