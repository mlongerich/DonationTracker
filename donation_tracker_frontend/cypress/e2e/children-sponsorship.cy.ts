describe('Children and Sponsorship Management', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
    cy.visit('/children');
  });

  it('displays the Children page with form and list', () => {
    cy.contains('Children Management').should('be.visible');
    cy.contains('Add Child').should('be.visible'); // Section heading, not button
    cy.contains('List Children').should('be.visible');
  });

  it('creates a new child and displays in list', () => {
    // Form is embedded on page - no button click needed
    // Fill out the form in the "Add Child" section
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Maria Gonzalez');

    // Submit the form
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify child appears in the list
    cy.contains('Maria Gonzalez', { timeout: 5000 }).should('be.visible');
    cy.contains('No active sponsor').should('be.visible');
  });

  it('adds a sponsor to a child', () => {
    // First create a donor
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('John Smith');
    cy.get('input[type="email"]').type('john.smith@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Navigate to children page
    cy.visit('/children');

    // Create a child using embedded form
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Sofia Rodriguez');
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Wait for child to appear with "No active sponsor"
    cy.contains('Sofia Rodriguez', { timeout: 10000 }).should('be.visible');
    cy.contains('No active sponsor', { timeout: 10000 }).should('be.visible');

    // Click "Add Sponsor" icon button (aria-label)
    cy.get('button[aria-label="add sponsor"]', { timeout: 10000 }).should('be.visible').click();

    // Search for and select donor - find the autocomplete input (modal should be open)
    cy.get('input[type="text"]').last().type('John');
    cy.wait(1000); // Wait for debounce

    // Select from dropdown options, not the typed text
    cy.get('[role="option"]').contains('John Smith').click();

    // Wait for form to update after donor selection
    cy.wait(500);

    // Enter monthly amount - select all then type to replace
    cy.get('input[type="number"]').type('{selectall}50');

    // Submit sponsorship - find SUBMIT button within the modal dialog
    cy.contains('.MuiDialog-root', 'Add Sponsor for Sofia Rodriguez')
      .contains('button', /submit/i)
      .click();

    // Verify modal closes and sponsorship appears
    cy.contains(/add sponsor for sofia rodriguez/i).should('not.exist');
    cy.contains(/sponsored by:.*john smith/i).should('be.visible');
    cy.contains(/\$50\.00\/mo/i).should('be.visible');
  });

  it('deletes a child', () => {
    // Create a child using embedded form
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Carlos Lopez');
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Wait for child to appear
    cy.contains('Carlos Lopez', { timeout: 10000 }).should('be.visible');

    // Click delete button
    cy.get('[aria-label="delete"]').first().click();

    // Verify child is removed
    cy.contains('Carlos Lopez').should('not.exist');
  });

  it('creates a sponsorship from the Sponsorships page', () => {
    // First create a donor
    cy.visit('/donors');
    cy.get('input[type="text"]').first().type('Jane Doe');
    cy.get('input[type="email"]').type('jane.doe@example.com');
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

    // Create a child using embedded form
    cy.visit('/children');
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Miguel Santos');
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();
    cy.contains('Miguel Santos', { timeout: 10000 }).should('be.visible');

    // Navigate to Sponsorships page
    cy.visit('/sponsorships');
    cy.contains('Create New Sponsorship').should('be.visible');

    // Fill in the sponsorship form
    // Select donor
    cy.get('input[type="text"]').first().type('Jane');
    cy.wait(1000); // Wait for debounce
    cy.contains('Jane Doe').click();

    // Select child
    cy.get('input[type="text"]').eq(1).type('Miguel');
    cy.wait(1000); // Wait for debounce
    cy.contains('Miguel Santos').click();

    // Wait for form to update after child selection
    cy.wait(500);

    // Enter monthly amount - select all then type to replace
    cy.get('input[type="number"]').type('{selectall}75');

    // Submit the form
    cy.contains('button', /submit/i).click();

    // Verify sponsorship appears in the list
    cy.contains('Jane Doe', { timeout: 10000 }).should('be.visible');
    cy.contains('Miguel Santos').should('be.visible');
    cy.contains('$75.00').should('be.visible');
  });
});
