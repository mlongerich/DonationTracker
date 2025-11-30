describe('Donor Form', () => {
  beforeEach(() => {
    cy.visit('/donors');
  });

  it('user can create donor and see success alert', () => {
    // Fill out the form by finding input fields
    cy.get('input[type="text"]').first().type('John Doe');
    cy.get('input[type="email"]').type('john@example.com');

    // Submit the form
    cy.contains('button', /submit/i).click();

    // Verify success message appears (created or updated)
    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Verify success alert has correct styling (green)
    cy.contains(/donor (created|updated) successfully/i)
      .parent()
      .should('have.class', 'MuiAlert-standardSuccess');
  });

  it('displays the donor form with all required fields', () => {
    cy.contains('Donation Tracker').should('be.visible');
    cy.contains('Add Donor').should('be.visible');
    cy.contains('label', /name/i).should('be.visible');
    cy.contains('label', /email/i).should('be.visible');
    cy.contains('button', /submit/i).should('be.visible');
  });

  it('displays created donor in the donor list', () => {
    // Fill out and submit the form
    cy.get('input[type="text"]').first().type('Jane Smith');
    cy.get('input[type="email"]').type('jane@example.com');
    cy.contains('button', /submit/i).click();

    // Wait for success message
    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Verify donor appears in the list
    cy.contains('Donors').should('be.visible');
    cy.contains('Jane Smith').should('be.visible');
    cy.contains('jane@example.com').should('be.visible');
  });

  it('creates donor with full phone and address information', () => {
    // Fill out all fields including phone and address
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .type('Bob Johnson');
    cy.contains('label', /email/i)
      .parent()
      .find('input')
      .type('bob@example.com');
    cy.contains('label', /phone/i)
      .parent()
      .find('input')
      .type('(555) 123-4567');
    cy.contains('label', /address line 1/i)
      .parent()
      .find('input')
      .type('123 Main St');
    cy.contains('label', /address line 2/i)
      .parent()
      .find('input')
      .type('Apt 4B');
    cy.contains('label', /city/i)
      .parent()
      .find('input')
      .type('San Francisco');
    cy.contains('label', /state/i)
      .parent()
      .find('input')
      .type('CA');
    cy.contains('label', /zip/i)
      .parent()
      .find('input')
      .type('94102');
    cy.contains('label', /country/i)
      .parent()
      .find('input')
      .clear()
      .type('USA');

    // Submit the form
    cy.contains('button', /submit/i).click();

    // Wait for success message
    cy.contains(/donor created successfully/i, { timeout: 10000 }).should(
      'be.visible'
    );

    // Verify donor appears in list with phone and address
    cy.contains('Bob Johnson').should('be.visible');
    cy.contains('(555) 123-4567').should('be.visible');
    cy.contains('123 Main St').should('be.visible');
    cy.contains('San Francisco CA 94102').should('be.visible');
  });

  it('edits existing donor to add phone and address', () => {
    // First create a donor without phone/address
    cy.get('input[type="text"]').first().type('Alice Brown');
    cy.get('input[type="email"]').type('alice@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor created successfully/i, { timeout: 10000 }).should(
      'be.visible'
    );

    // Find and click edit button for the donor
    cy.contains('Alice Brown')
      .parents('[data-testid="donor-row"]')
      .find('button[aria-label="edit"]')
      .click();

    // Add phone and address to existing donor
    cy.contains('label', /phone/i)
      .parent()
      .find('input')
      .type('(555) 987-6543');
    cy.contains('label', /address line 1/i)
      .parent()
      .find('input')
      .type('456 Oak Ave');
    cy.contains('label', /city/i)
      .parent()
      .find('input')
      .type('Portland');
    cy.contains('label', /state/i)
      .parent()
      .find('input')
      .type('OR');
    cy.contains('label', /zip/i)
      .parent()
      .find('input')
      .type('97201');

    // Submit the update
    cy.contains('button', /update/i).click();

    // Wait for success message
    cy.contains(/donor updated successfully/i, { timeout: 10000 }).should(
      'be.visible'
    );

    // Verify updated donor shows phone and address
    cy.contains('Alice Brown').should('be.visible');
    cy.contains('(555) 987-6543').should('be.visible');
    cy.contains('456 Oak Ave').should('be.visible');
    cy.contains('Portland OR 97201').should('be.visible');
  });
});
