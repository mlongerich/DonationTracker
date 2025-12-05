describe('Navigation', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
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

    // Navigate to admin page to access Projects tab
    cy.contains('a', 'Admin').click();
    cy.url().should('include', '/admin');
    cy.contains('h4', 'Admin').should('be.visible');

    // Click Projects tab within Admin page
    cy.contains('button', 'Projects').click();
    cy.contains('h2', 'Create Project').should('be.visible');
    cy.contains('h2', 'Project List').should('be.visible');

    // Navigate back to donations
    cy.contains('a', 'Donations').click();
    cy.url().should('include', '/donations');
    cy.contains('Donation Management').should('be.visible');
  });
});
