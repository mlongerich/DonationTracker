describe('Donor Merge - Donation & Sponsorship Reassignment', () => {
  beforeEach(() => {
    // Clear database
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');
  });

  it('reassigns donations to merged donor', () => {
    // Create first donor with donation
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('John Doe');
    cy.get('input[type="email"]').type('john@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create donation for first donor
    cy.visit('/donations');
    cy.get('input[type="number"]').type('100');
    cy.get('input[type="date"]').type('2024-01-15');

    // Select donor from autocomplete
    cy.contains('label', 'Donor')
      .parent()
      .find('input')
      .click()
      .type('John Doe');

    // Wait for autocomplete options
    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('[role="option"]').first().click();

    cy.contains('button', /create donation/i).click();
    cy.contains(/donation (created|added) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create second donor with donation
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('J. Doe');
    cy.get('input[type="email"]').type('j.doe@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create donation for second donor
    cy.visit('/donations');
    cy.get('input[type="number"]').type('200');
    cy.get('input[type="date"]').clear().type('2024-02-20');

    // Select donor from autocomplete
    cy.contains('label', 'Donor')
      .parent()
      .find('input')
      .click()
      .type('J. Doe');

    // Wait for autocomplete options
    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('[role="option"]').first().click();

    cy.contains('button', /create donation/i).click();
    cy.contains(/donation (created|added) successfully/i, { timeout: 10000 }).should('be.visible');

    // Now merge the two donors
    cy.visit('/donors');
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 2);

    // Select both donors
    cy.get('[data-testid="donor-row"]').first().find('input[type="checkbox"]').check();
    cy.get('[data-testid="donor-row"]').last().find('input[type="checkbox"]').check();

    // Click merge button
    cy.contains('button', 'Merge Selected', { timeout: 5000 }).should('be.visible').click();

    // Select first donor's name and second donor's email
    cy.contains('label', 'John Doe')
      .find('input[type="radio"]')
      .check({ force: true });

    cy.contains('label', 'j.doe@example.com')
      .find('input[type="radio"]')
      .check({ force: true });

    // Confirm merge
    cy.contains('button', 'Confirm Merge').click();

    // Wait for merge to complete
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 1);

    // Navigate to donations page
    cy.visit('/donations');

    // Both donations should be visible
    cy.contains('$100.00').should('be.visible');
    cy.contains('$200.00').should('be.visible');

    // Both should show merged donor name
    cy.contains('John Doe').should('be.visible');

    // Original donor names should not appear (only merged donor)
    cy.contains('J. Doe').should('not.exist');
  });

  it('reassigns sponsorships to merged donor', () => {
    // Create first donor
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('Alice Smith');
    cy.get('input[type="email"]').type('alice@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create child for first sponsorship
    cy.visit('/children');
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Child One');
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();
    cy.contains('Child One', { timeout: 10000 }).should('be.visible');

    // Add sponsor to child (click Add Sponsor button)
    cy.get('button[aria-label="add sponsor"]').first().click();

    // Select donor from autocomplete in modal
    cy.get('input[type="text"]').last().type('Alice');
    cy.wait(1000);
    cy.get('[role="option"]').contains('Alice Smith').click();
    cy.wait(500);

    // Enter monthly amount
    cy.get('input[type="number"]').type('{selectall}50');

    // Submit sponsorship
    cy.contains('.MuiDialog-root', 'Add Sponsor')
      .contains('button', /submit/i)
      .click();

    // Verify modal closes (sponsorship created)
    cy.contains('.MuiDialog-root', 'Add Sponsor', { timeout: 10000 }).should('not.exist');

    // Verify sponsorship appears in child list
    cy.contains('Child One').parent().parent().should('contain', 'Alice Smith');
    cy.contains('Child One').parent().parent().should('contain', '$50.00/mo');

    // Create second donor
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('A. Smith');
    cy.get('input[type="email"]').type('a.smith@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create child for second sponsorship
    cy.visit('/children');
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Child Two');
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();
    cy.contains('Child Two', { timeout: 10000 }).should('be.visible');
    cy.contains('No active sponsor', { timeout: 10000 }).should('be.visible');

    // Add sponsor to child (click Add Sponsor button - use index since there are now 2 children)
    cy.get('button[aria-label="add sponsor"]').eq(1).click();

    // Select donor from autocomplete in modal
    cy.get('input[type="text"]').last().type('A. Smith');
    cy.wait(1000);
    cy.get('[role="option"]').contains('A. Smith').click();
    cy.wait(500);

    // Enter monthly amount
    cy.get('input[type="number"]').type('{selectall}75');

    // Submit sponsorship
    cy.contains('.MuiDialog-root', 'Add Sponsor')
      .contains('button', /submit/i)
      .click();

    // Verify modal closes (sponsorship created)
    cy.contains('.MuiDialog-root', 'Add Sponsor', { timeout: 10000 }).should('not.exist');

    // Verify sponsorship appears in child list
    cy.contains('Child Two').parent().parent().should('contain', 'A. Smith');
    cy.contains('Child Two').parent().parent().should('contain', '$75.00/mo');

    // Now merge the two donors
    cy.visit('/donors');
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 2);

    // Select both donors
    cy.get('[data-testid="donor-row"]').first().find('input[type="checkbox"]').check();
    cy.get('[data-testid="donor-row"]').last().find('input[type="checkbox"]').check();

    // Click merge button
    cy.contains('button', 'Merge Selected', { timeout: 5000 }).should('be.visible').click();

    // Select first donor's name and second donor's email
    cy.contains('label', 'Alice Smith')
      .find('input[type="radio"]')
      .check({ force: true });

    cy.contains('label', 'a.smith@example.com')
      .find('input[type="radio"]')
      .check({ force: true });

    // Confirm merge
    cy.contains('button', 'Confirm Merge').click();

    // Wait for merge to complete
    cy.get('[data-testid="donor-row"]', { timeout: 10000 }).should('have.length', 1);

    // Navigate to children page to verify sponsorships
    cy.visit('/children');

    // Both children should be visible with merged donor as sponsor
    cy.contains('Child One').parent().parent().should('contain', 'Alice Smith');
    cy.contains('Child One').parent().parent().should('contain', '$50.00/mo');

    cy.contains('Child Two').parent().parent().should('contain', 'Alice Smith');
    cy.contains('Child Two').parent().parent().should('contain', '$75.00/mo');

    // Original donor name should not appear (only merged donor)
    cy.contains('A. Smith').should('not.exist');
  });
});
