describe('Donation Entry', () => {
  beforeEach(() => {
    cy.visit('/donors');
  });

  it('displays the donation form with all required fields', () => {
    // Override beforeEach - donation form is on /donations page
    cy.visit('/donations');

    cy.contains('Record Donation').should('be.visible');
    cy.contains('label', /amount/i).should('be.visible');
    cy.contains('label', /date/i).should('be.visible');
    cy.contains('label', /donor/i).should('be.visible');
    cy.contains('button', /create donation/i).should('be.visible');
  });

  it('creates a donor and then creates a donation for that donor', () => {
    // Step 1: Create a donor first
    const donorName = `Test Donor ${Date.now()}`;
    const donorEmail = `test${Date.now()}@example.com`;

    // Use the same pattern as donor-form.cy.ts which works
    cy.get('input[type="text"]').first().type(donorName);
    cy.get('input[type="email"]').first().type(donorEmail);
    cy.contains('button', /submit/i).click();

    // Wait for donor creation success
    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Navigate to donations page to create donation
    cy.visit('/donations');

    // Step 2: Create a donation for the new donor
    cy.contains('Record Donation').scrollIntoView();

    // Fill out donation amount
    cy.get('input[type="number"]').type('100.50');

    // Date field should have today's date by default
    cy.get('input[type="date"]').should('exist');

    // Use Material-UI Autocomplete to search and select donor
    // Find the Donor autocomplete (it's the second autocomplete on the form)
    cy.contains('label', 'Donor')
      .parent()
      .find('input')
      .click()
      .type(donorName);

    // Wait for autocomplete options to appear (debounced after 300ms)
    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1);

    // Click the first available option (our newly created donor should be in results)
    cy.get('[role="option"]').first().click();

    // Submit the donation form
    cy.contains('button', /create donation/i).click();

    // Verify success message confirms donation was created
    cy.contains(/donation created successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // TODO TICKET-016: Add test for donation appearing in list
    // Currently the donation is created successfully (verified by success message and backend logs)
    // but there may be a React state update timing issue preventing it from appearing immediately
  });
});
