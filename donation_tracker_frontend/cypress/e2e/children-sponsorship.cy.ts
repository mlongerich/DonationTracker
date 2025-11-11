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

  it('creates a child with boy gender and displays Boy icon', () => {
    // Fill out name
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Juan Martinez');

    // Select Boy gender - click the MUI Select
    cy.contains('h2', 'Add Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Boy').click();

    // Submit form
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify child appears in list with Boy icon
    cy.contains('Juan Martinez', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="BoyIcon"]').should('be.visible');
  });

  it('creates a child with girl gender and displays Girl icon', () => {
    // Fill out name
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Ana Rodriguez');

    // Select Girl gender
    cy.contains('h2', 'Add Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Girl').click();

    // Submit form
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify child appears in list with Girl icon
    cy.contains('Ana Rodriguez', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="GirlIcon"]').should('be.visible');
  });

  it('creates a child with no gender and displays no icon', () => {
    // Fill out name only (no gender selected)
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Sam Lee');

    // Submit form
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify child appears in list with NO gender icon
    cy.contains('Sam Lee', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="BoyIcon"]').should('not.exist');
    cy.get('[data-testid="GirlIcon"]').should('not.exist');
  });

  it('edits a child to change gender from boy to girl', () => {
    // Create child with boy gender
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Alex Chen');
    cy.contains('h2', 'Add Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Boy').click();
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify Boy icon appears
    cy.contains('Alex Chen', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="BoyIcon"]').should('be.visible');

    // Click edit button
    cy.get('[aria-label="edit"]').first().click();

    // Change gender to girl
    cy.contains('h2', 'Edit Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Girl').click();

    // Submit
    cy.contains('h2', 'Edit Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify Girl icon appears (Boy icon gone)
    cy.wait(1000); // Wait for update
    cy.get('[data-testid="GirlIcon"]').should('be.visible');
    cy.get('[data-testid="BoyIcon"]').should('not.exist');
  });

  it('edits a child to clear gender to null', () => {
    // Create child with girl gender
    cy.contains('h2', 'Add Child')
      .parent()
      .find('input[type="text"]')
      .first()
      .type('Taylor Kim');
    cy.contains('h2', 'Add Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Girl').click();
    cy.contains('h2', 'Add Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify Girl icon appears
    cy.contains('Taylor Kim', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="GirlIcon"]').should('be.visible');

    // Click edit button
    cy.get('[aria-label="edit"]').first().click();

    // Clear gender to "Not specified"
    cy.contains('h2', 'Edit Child')
      .parent()
      .find('[role="combobox"]')
      .click();
    cy.contains('li', 'Not specified').click();

    // Submit
    cy.contains('h2', 'Edit Child')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify no gender icon appears
    cy.wait(1000); // Wait for update
    cy.get('[data-testid="BoyIcon"]').should('not.exist');
    cy.get('[data-testid="GirlIcon"]').should('not.exist');
  });
});
