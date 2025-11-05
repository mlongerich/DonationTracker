describe('Donor Merge', () => {
  beforeEach(() => {
    // Clear database
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
    cy.visit('/donors');
  });

  it('merges two donors with selected field values', () => {
    // Create two donors
    cy.get('input[type="text"]').first().type('Alice Smith');
    cy.get('input[type="email"]').type('alice@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    cy.get('input[type="text"]').first().clear().type('Alice S.');
    cy.get('input[type="email"]').clear().type('alice.smith@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Select both donors using checkboxes
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 2);

    // Check both checkboxes
    cy.get('[data-testid="donor-row"]').first().find('input[type="checkbox"]').check();
    cy.get('[data-testid="donor-row"]').last().find('input[type="checkbox"]').check();

    // Wait for "Merge Selected" button to appear (only shows when 2+ selected)
    cy.contains('button', 'Merge Selected', { timeout: 5000 }).should('be.visible').click();

    // Merge modal should appear with donor names visible
    cy.contains('Merge Donors').should('be.visible');
    cy.contains('Alice S.').should('be.visible');
    cy.contains('Alice Smith').should('be.visible');

    // Select Alice Smith's name - find radio button associated with "Alice Smith" label
    cy.contains('label', 'Alice Smith')
      .find('input[type="radio"]')
      .check({ force: true });

    // Select alice.smith@example.com email - find radio button associated with that label
    cy.contains('label', 'alice.smith@example.com')
      .find('input[type="radio"]')
      .check({ force: true });

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
