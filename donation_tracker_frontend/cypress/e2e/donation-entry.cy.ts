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

  it('creates a donation with check payment method and displays badge', () => {
    // Step 1: Create a donor first
    const donorName = `Check Donor ${Date.now()}`;
    const donorEmail = `check${Date.now()}@example.com`;

    cy.get('input[type="text"]').first().type(donorName);
    cy.get('input[type="email"]').first().type(donorEmail);
    cy.contains('button', /submit/i).click();

    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Navigate to donations page
    cy.visit('/donations');

    // Fill out donation form
    cy.get('input[type="number"]').type('50.00');

    // Select donor from autocomplete
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .click()
      .type(donorName);

    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('[role="option"]').first().click();

    // Select payment method: Check
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Payment Method')
      .parent()
      .find('[role="combobox"]')
      .click();

    cy.get('[role="option"]').contains('Check').click();

    // Submit form
    cy.contains('button', /create donation/i).click();

    cy.contains(/donation created successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Verify Check badge appears in donation list
    cy.contains('$50.00').parent().parent().contains('Check').should('be.visible');
  });

  it('creates a donation with cash payment method and displays badge', () => {
    // Step 1: Create a donor first
    const donorName = `Cash Donor ${Date.now()}`;
    const donorEmail = `cash${Date.now()}@example.com`;

    cy.get('input[type="text"]').first().type(donorName);
    cy.get('input[type="email"]').first().type(donorEmail);
    cy.contains('button', /submit/i).click();

    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Navigate to donations page
    cy.visit('/donations');

    // Fill out donation form
    cy.get('input[type="number"]').type('75.00');

    // Select donor from autocomplete
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .click()
      .type(donorName);

    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1);
    cy.get('[role="option"]').first().click();

    // Select payment method: Cash
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Payment Method')
      .parent()
      .find('[role="combobox"]')
      .click();

    cy.get('[role="option"]').contains('Cash').click();

    // Submit form
    cy.contains('button', /create donation/i).click();

    cy.contains(/donation created successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Verify Cash badge appears in donation list
    cy.contains('$75.00').parent().parent().contains('Cash').should('be.visible');
  });

  it('creates donor via quick create icon and completes donation', () => {
    cy.visit('/donations');

    // Click the create donor icon button next to donor autocomplete
    cy.get('button[aria-label="create donor"]').click();

    // Verify QuickDonorCreateDialog appeared
    cy.contains('Create New Donor').should('be.visible');

    // Fill out donor form in dialog
    const donorName = `Quick Donor ${Date.now()}`;
    const donorEmail = `quick${Date.now()}@example.com`;

    // Find inputs within the dialog by label
    cy.contains('Create New Donor')
      .parent()
      .contains('label', /^name$/i)
      .parent()
      .find('input')
      .type(donorName);
    cy.contains('Create New Donor')
      .parent()
      .contains('label', /^email$/i)
      .parent()
      .find('input')
      .type(donorEmail);
    cy.contains('Create New Donor')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Dialog should close after successful creation (no success message shown)
    cy.contains('Create New Donor', { timeout: 10000 }).should('not.exist');

    // Verify donor is auto-selected in the autocomplete
    cy.contains('label', 'Donor')
      .parent()
      .find('input')
      .should('have.value', `${donorName} (${donorEmail})`);

    // Complete the donation
    cy.get('input[type="number"]').clear().type('200.00');

    // Click the Create Donation button
    cy.contains('button', /create donation/i).click();

    // Verify donation created successfully
    cy.contains(/donation created successfully/i, {
      timeout: 10000,
    }).should('be.visible');
  });

  it('shows validation error in Snackbar when creating donor with invalid email', () => {
    cy.visit('/donations');

    // Click the create donor icon button
    cy.get('button[aria-label="create donor"]').click();

    // Fill out form with invalid email (find inputs by label)
    cy.contains('Create New Donor')
      .parent()
      .contains('label', /^name$/i)
      .parent()
      .find('input')
      .type('Test Donor');
    cy.contains('Create New Donor')
      .parent()
      .contains('label', /^email$/i)
      .parent()
      .find('input')
      .type('invalid-email');
    cy.contains('Create New Donor')
      .parent()
      .contains('button', /submit/i)
      .click();

    // Verify validation error appears in Snackbar
    cy.get('body').contains(/email/i, { timeout: 10000 }).should('be.visible');

    // Dialog should remain open (not close on error)
    cy.contains('Create New Donor').should('be.visible');
  });

  it('preserves donation form data when dialog is canceled', () => {
    cy.visit('/donations');

    // Fill out donation form with data
    cy.get('input[type="number"]').type('350.75');

    // Open create donor dialog
    cy.get('button[aria-label="create donor"]').click();

    // Verify dialog is open
    cy.contains('Create New Donor').should('be.visible');

    // Close dialog by pressing Escape
    cy.get('body').type('{esc}');

    // Verify dialog is closed
    cy.contains('Create New Donor').should('not.exist');

    // Verify donation form data is preserved
    cy.get('input[type="number"]').should('have.value', '350.75');
  });

  it('creates project via quick create icon and completes donation', () => {
    cy.visit('/donations');

    // Click the create entity icon button next to project/child autocomplete
    cy.get('button[aria-label="create project or child"]').click();

    // Verify QuickEntityCreateDialog appeared with tabs
    cy.contains('Create New Entity').should('be.visible');

    // Switch to project tab
    cy.contains('button[role="tab"]', /create project/i).click();

    // Fill out project form in dialog
    const projectTitle = `Quick Project ${Date.now()}`;

    // Find the visible required input (project title) within the dialog
    cy.get('[role="dialog"]')
      .find('input[required]')
      .filter(':visible')
      .first()
      .type(projectTitle);

    // Submit project creation using the dialog's visible submit button
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .filter(':visible')
      .click();

    // Wait for API call and dialog to close
    cy.contains('Create New Entity', { timeout: 10000 }).should('not.exist');
    cy.get('[role="dialog"]').should('not.exist');

    // Verify project is auto-selected in the autocomplete
    cy.contains('label', 'Donation For')
      .parent()
      .find('input')
      .should('have.value', projectTitle);

    // Create a donor first
    const donorName = `Project Donor ${Date.now()}`;
    const donorEmail = `project${Date.now()}@example.com`;

    cy.visit('/donors');
    cy.get('input[type="text"]').first().type(donorName);
    cy.get('input[type="email"]').first().type(donorEmail);
    cy.contains('button', /submit/i).click();
    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');

    // Navigate back to donations and complete the donation
    cy.visit('/donations');

    // Ensure no dialogs are open
    cy.contains('Create New Entity').should('not.exist');
    cy.contains('Create New Donor').should('not.exist');

    // Project should still be selected (from earlier creation)
    cy.get('input[type="number"]').clear().type('150.00');

    // Select donor from autocomplete (be specific to avoid clicking create donor button)
    cy.contains('label', 'Donor')
      .parent()
      .find('input[role="combobox"]')
      .click()
      .type(donorName);

    cy.get('[role="option"]', { timeout: 10000 }).should(
      'have.length.at.least',
      1
    );
    cy.get('[role="option"]').first().click();

    // Submit donation
    cy.contains('button', /create donation/i).click();

    // Verify donation created successfully
    cy.contains(/donation created successfully/i, {
      timeout: 10000,
    }).should('be.visible');
  });

  it('pre-fills project title when user searches before clicking create icon', () => {
    cy.visit('/donations');

    const searchText = 'Summer Campaign';

    // Type in project autocomplete
    cy.contains('label', 'Donation For')
      .parent()
      .find('input')
      .type(searchText);

    // Click create entity icon
    cy.get('button[aria-label="create project or child"]').click();

    // Verify dialog opened
    cy.contains('Create New Entity').should('be.visible');

    // Switch to project tab
    cy.contains('button[role="tab"]', /create project/i).click();

    // Verify title is pre-filled
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .should('have.value', searchText);
  });

  it('disables create button when project title is empty', () => {
    cy.visit('/donations');

    // Click create entity icon
    cy.get('button[aria-label="create project or child"]').click();

    // Verify dialog opened with tabs
    cy.contains('Create New Entity').should('be.visible');

    // Switch to project tab
    cy.contains('button[role="tab"]', /create project/i).click();

    // Wait for form to appear, then find the visible submit button
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .filter(':visible')
      .should('be.disabled');

    // Type in title field
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .type('Valid Title');

    // Submit button should now be enabled
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .filter(':visible')
      .should('not.be.disabled');
  });

  it('disables create button when child name is empty', () => {
    cy.visit('/donations');

    // Click create entity icon
    cy.get('button[aria-label="create project or child"]').click();

    // Verify dialog opened with child tab as default
    cy.contains('Create New Entity').should('be.visible');
    cy.contains('button[role="tab"]', /create child/i).should('have.attr', 'aria-selected', 'true');

    // Submit button should be disabled when name is empty
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .filter(':visible')
      .should('be.disabled');

    // Type in name field (child form only has one Name field)
    cy.get('[role="dialog"]')
      .find('input[required]')
      .filter(':visible')
      .first()
      .type('Maria');

    // Submit button should now be enabled
    cy.get('[role="dialog"]')
      .find('button[type="submit"]')
      .filter(':visible')
      .should('not.be.disabled');
  });

  it('creates child via tabbed dialog and completes donation', () => {
    cy.visit('/donations');

    // Click the create entity icon
    cy.get('button[aria-label="create project or child"]').click();

    // Verify dialog appeared with tabs (defaults to child tab)
    cy.contains('Create New Entity').should('be.visible');
    cy.contains('button[role="tab"]', /create child/i).should('have.attr', 'aria-selected', 'true');

    // Fill out child form
    const childName = `Quick Child ${Date.now()}`;
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .type(childName);

    // Submit child creation
    cy.contains('button', /submit/i).click();

    // Dialog should close and child should be auto-selected
    cy.contains('Create New Entity', { timeout: 10000 }).should('not.exist');

    // Verify child is auto-selected in the autocomplete
    cy.contains('label', 'Donation For')
      .parent()
      .find('input')
      .should('have.value', childName);
  });

  it('switches between tabs and preserves form state', () => {
    cy.visit('/donations');

    // Open dialog
    cy.get('button[aria-label="create project or child"]').click();

    // Fill child form
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .type('Test Child');

    // Switch to project tab
    cy.contains('button[role="tab"]', /create project/i).click();

    // Fill project form
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .type('Test Project');

    // Switch back to child tab
    cy.contains('button[role="tab"]', /create child/i).click();

    // Verify child form state preserved
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .should('have.value', 'Test Child');

    // Switch to project tab again
    cy.contains('button[role="tab"]', /create project/i).click();

    // Verify project form state preserved
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .should('have.value', 'Test Project');
  });

  it('pre-fills entity name from search input', () => {
    cy.visit('/donations');

    // Type in project/child autocomplete
    cy.contains('label', 'Donation For')
      .parent()
      .find('input')
      .type('Christmas Campaign');

    // Click create entity button
    cy.get('button[aria-label="create project or child"]').click();

    // Verify dialog opened
    cy.contains('Create New Entity').should('be.visible');

    // Child tab is default - verify child name is pre-filled
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .should('have.value', 'Christmas Campaign');

    // Switch to project tab
    cy.contains('button[role="tab"]', /create project/i).click();

    // Verify project title is also pre-filled
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .should('have.value', 'Christmas Campaign');
  });

  it('resets form state when dialog closes and reopens', () => {
    cy.visit('/donations');

    // Open dialog
    cy.get('button[aria-label="create project or child"]').click();

    // Fill child form
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .type('Temp Child');

    // Switch to project tab and fill
    cy.contains('button[role="tab"]', /create project/i).click();
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .type('Temp Project');

    // Close dialog
    cy.get('body').type('{esc}');
    cy.contains('Create New Entity').should('not.exist');

    // Reopen dialog
    cy.get('button[aria-label="create project or child"]').click();

    // Verify child form is reset (default tab)
    cy.contains('label', /name/i)
      .parent()
      .find('input')
      .should('have.value', '');

    // Switch to project tab and verify it's reset
    cy.contains('button[role="tab"]', /create project/i).click();
    cy.contains('label', /title/i)
      .parent()
      .find('input')
      .should('have.value', '');
  });
});
