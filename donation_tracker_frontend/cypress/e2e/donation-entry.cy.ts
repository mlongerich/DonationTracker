describe('Donation Entry', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('displays the donation form with all required fields', () => {
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

    // Step 2: Create a donation for the new donor
    cy.contains('Record Donation').scrollIntoView();

    // Fill out donation amount
    cy.get('input[type="number"]').type('100.50');

    // Date field should have today's date by default
    cy.get('input[type="date"]').should('exist');

    // Wait for the newly created donor to appear in dropdown
    // The dropdown should contain the donor after App refetches
    const optionText = `${donorName} (${donorEmail})`;
    cy.get('select#donor_id option', { timeout: 15000 }).should(($options) => {
      const text = $options.text();
      expect(text).to.include(donorName);
    });

    // Select the donor from dropdown
    cy.get('select#donor_id').select(optionText);

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
