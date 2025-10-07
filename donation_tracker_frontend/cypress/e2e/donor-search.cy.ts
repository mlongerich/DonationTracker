describe('Donor Search & Pagination', () => {
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

  it('searches donors by name', () => {
    // Create multiple donors
    cy.createDonor('Alice Smith', 'alice@example.com');
    cy.createDonor('Bob Jones', 'bob@example.com');
    cy.createDonor('Alice Brown', 'alice.brown@example.com');

    // Verify all donors appear and count shows 3
    cy.contains('Donors (3)').should('be.visible');
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Bob Jones').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');

    // Search for "Alice"
    cy.get('input[placeholder="Search by name or email..."]').type('Alice');

    // Wait for debounce and results to update
    cy.wait(500);

    // Should show only Alice donors
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');
    cy.contains('Bob Jones').should('not.exist');

    // Should show count of 2
    cy.contains('Donors (2)').should('be.visible');
  });

  it('searches donors by email partial match', () => {
    // Create donors with different email patterns
    cy.createDonor('Michael Longerich', 'mlongerich@gmail.com');
    cy.createDonor('John Smith', 'michael@mailinator.com');
    cy.createDonor('Bob Example', 'example@yahoo.com');

    // Verify all donors appear
    cy.contains('Donors (3)').should('be.visible');

    // Search for "n" - should find mlongerich@gmail.com and michael@mailinator.com
    cy.get('input[placeholder="Search by name or email..."]').type('n');

    // Wait for debounce
    cy.wait(500);

    // Should show only donors with "n" in name or email
    cy.contains('Michael Longerich').should('be.visible');
    cy.contains('mlongerich@gmail.com').should('be.visible');
    cy.contains('John Smith').should('be.visible');
    cy.contains('michael@mailinator.com').should('be.visible');
    cy.contains('Bob Example').should('not.exist');

    // Should show count of 2
    cy.contains('Donors (2)').should('be.visible');
  });

  it('searches donors by email domain', () => {
    cy.createDonor('User One', 'user1@gmail.com');
    cy.createDonor('User Two', 'user2@yahoo.com');
    cy.createDonor('User Three', 'user3@gmail.com');

    // Search for "@gmail"
    cy.get('input[placeholder="Search by name or email..."]').type('@gmail');

    // Wait for debounce
    cy.wait(500);

    // Should show only Gmail users
    cy.contains('User One').should('be.visible');
    cy.contains('User Three').should('be.visible');
    cy.contains('User Two').should('not.exist');

    cy.contains('Donors (2)').should('be.visible');
  });

  it('searches donors by partial first name', () => {
    cy.createDonor('Alice Smith', 'asmith@example.com');
    cy.createDonor('Bob Johnson', 'bjohnson@example.com');
    cy.createDonor('Alice Brown', 'abrown@example.com');

    // Search for "Ali" (partial first name)
    cy.get('input[placeholder="Search by name or email..."]').type('Ali');

    // Wait for debounce
    cy.wait(500);

    // Should show both Alice donors
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');
    cy.contains('Bob Johnson').should('not.exist');

    cy.contains('Donors (2)').should('be.visible');
  });

  it('searches donors by last name', () => {
    cy.createDonor('Alice Smith', 'asmith@example.com');
    cy.createDonor('Bob Johnson', 'bjohnson@example.com');
    cy.createDonor('Charlie Smith', 'csmith@example.com');

    // Search for "Smith" (last name)
    cy.get('input[placeholder="Search by name or email..."]').type('Smith');

    // Wait for debounce
    cy.wait(500);

    // Should show both Smith donors
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Charlie Smith').should('be.visible');
    cy.contains('Bob Johnson').should('not.exist');

    cy.contains('Donors (2)').should('be.visible');
  });
});
