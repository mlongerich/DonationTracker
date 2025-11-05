describe('Donor Archive & Restore', () => {
  beforeEach(() => {
    cy.clearDonors();
    cy.visit('/donors');
    // Wait for page to fully load
    cy.contains('Donation Tracker').should('be.visible');
    cy.contains('Add Donor').should('be.visible');
  });

  it('archives a donor and hides it from the list', () => {
    // Create a donor
    cy.createDonor('John Doe', 'john@example.com');

    // Verify donor is visible
    cy.contains('John Doe').should('be.visible');

    // Click archive button
    cy.get('button[aria-label="archive"]').first().click();

    // Wait for API call to complete
    cy.wait(500);

    // Donor should be hidden (removed from list)
    cy.contains('John Doe').should('not.exist');
  });
});
