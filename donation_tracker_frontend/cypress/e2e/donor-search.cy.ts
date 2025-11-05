describe('Donor Search & Pagination', () => {
  beforeEach(() => {
    cy.clearDonors();
    cy.visit('/donors');
    // Wait for page to fully load
    cy.contains('Donation Tracker').should('be.visible');
    cy.contains('Add Donor').should('be.visible');
  });

  it('searches donors by name', () => {
    // Create multiple donors
    cy.createDonor('Alice Smith', 'alice@example.com');
    cy.createDonor('Bob Jones', 'bob@example.com');
    cy.createDonor('Alice Brown', 'alice.brown@example.com');

    // Verify all donors appear
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 3);
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Bob Jones').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');

    // Search for "Alice"
    cy.get('input[placeholder="Search by name or email..."]').type('Alice');

    // Wait for debounce and results to update
    cy.wait(500);

    // Should show only Alice donors
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');
    cy.contains('Bob Jones').should('not.exist');
  });

  it('searches donors by email partial match', () => {
    // Create donors with different email patterns
    cy.createDonor('Michael Longerich', 'mlongerich@gmail.com');
    cy.createDonor('John Smith', 'michael@mailinator.com');
    cy.createDonor('Bob Example', 'example@yahoo.com');

    // Verify all donors appear
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 3);

    // Search for "n" - should find mlongerich@gmail.com and michael@mailinator.com
    cy.get('input[placeholder="Search by name or email..."]').type('n');

    // Wait for debounce
    cy.wait(500);

    // Should show only donors with "n" in name or email
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.contains('Michael Longerich').should('be.visible');
    cy.contains('mlongerich@gmail.com').should('be.visible');
    cy.contains('John Smith').should('be.visible');
    // Note: mailinator emails are hidden in UI, so we won't see the actual email
    cy.contains('Bob Example').should('not.exist');
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
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.contains('User One').should('be.visible');
    cy.contains('User Three').should('be.visible');
    cy.contains('User Two').should('not.exist');
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
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Alice Brown').should('be.visible');
    cy.contains('Bob Johnson').should('not.exist');
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
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('Charlie Smith').should('be.visible');
    cy.contains('Bob Johnson').should('not.exist');
  });
});
