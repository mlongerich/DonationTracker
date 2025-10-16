describe('Donor Merge', () => {
  beforeEach(() => {
    // Clear database
    cy.request('DELETE', 'http://localhost:3001/api/donors/all');
    cy.visit('/');
  });

  it('merges two donors with selected field values', () => {
    // Create two donors
    cy.get('input[name="name"]').type('Alice Smith');
    cy.get('input[name="email"]').type('alice@example.com');
    cy.contains('button', 'Add Donor').click();

    cy.get('input[name="name"]').clear().type('Alice S.');
    cy.get('input[name="email"]').clear().type('alice.smith@example.com');
    cy.contains('button', 'Add Donor').click();

    // Select both donors using checkboxes
    cy.get('[data-testid="donor-row"]').should('have.length', 2);
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').last().check();

    // Click "Merge Selected" button
    cy.contains('button', 'Merge Selected').should('be.visible').click();

    // Merge modal should appear
    cy.contains('Merge Donors').should('be.visible');

    // Select Alice Smith's name (first radio in Name group)
    cy.contains('legend', 'Name').parent().within(() => {
      cy.contains('Alice Smith').click();
    });

    // Select alice.smith@example.com email (second radio in Email group)
    cy.contains('legend', 'Email').parent().within(() => {
      cy.contains('alice.smith@example.com').click();
    });

    // Confirm merge
    cy.contains('button', 'Confirm Merge').click();

    // Should show merged donor
    cy.get('[data-testid="donor-row"]').should('have.length', 1);
    cy.contains('Alice Smith').should('be.visible');
    cy.contains('alice.smith@example.com').should('be.visible');

    // Original donors should not be visible
    cy.contains('Alice S.').should('not.exist');
    cy.contains('alice@example.com').should('not.exist');
  });
});
