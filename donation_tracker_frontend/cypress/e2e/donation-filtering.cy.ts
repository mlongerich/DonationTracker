describe('Donation Date Range Filtering', () => {
  // Helper function to create a donation via UI
  const createDonationViaUI = (donorName: string, donorEmail: string, amount: string, date: string) => {
    // First, create donor via API if it doesn't exist (autocomplete doesn't create donors)
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: donorName, email: donorEmail },
    });

    // Navigate to donations page
    cy.visit('/donations');
    cy.contains('Donation Management').should('be.visible');

    // Fill out the Record Donation form
    // 1. Select donor from autocomplete
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .type(donorName);

    // Wait for autocomplete dropdown to load
    cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
    cy.get('[role="option"]').contains(donorName).should('be.visible');

    // Click the option to select it
    cy.get('[role="option"]').contains(donorName).click();

    // 2. Enter amount
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Amount')
      .parent()
      .find('input')
      .clear()
      .type(amount);

    // 3. Enter date using TextField type="date"
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Date')
      .parent()
      .find('input[type="date"]')
      .clear()
      .type(date);

    // 4. Submit form
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('button', 'Create Donation')
      .click();

    // Wait for success notification
    cy.contains('Donation created successfully', { timeout: 5000 }).should('be.visible');
  };

  beforeEach(() => {
    cy.login();
    // Clean database before each test
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);

    // Intercept donations API calls globally for all tests
    cy.intercept('GET', '/api/donations*').as('getDonations');

    cy.visit('/donations');
    // Wait for page to load
    cy.contains('Donation Management').should('be.visible');
  });

  it('filters donations by start date', () => {
    // Create two donations via UI
    createDonationViaUI('Test Donor 1A', 'test1a@example.com', '11.11', '2024-01-01');
    createDonationViaUI('Test Donor 1A', 'test1a@example.com', '22.22', '2024-10-01');

    // Navigate to donations page to see all donations
    cy.visit('/donations');

    // Should see both donations initially
    cy.contains('$11.11', { timeout: 5000 }).should('be.visible');
    cy.contains('$22.22').should('be.visible');

    // Filter by start date (only recent donation - September 1, 2024)
    // DatePicker uses segmented spinbutton inputs in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('09');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

    // Wait for filtered API call
    cy.wait('@getDonations');

    // Should only see recent donation
    cy.contains('$22.22').should('be.visible');
    cy.contains('$11.11').should('not.exist');
  });

  it('filters donations by end date', () => {
    // Create two donations via UI
    createDonationViaUI('Test Donor 2B', 'test2b@example.com', '33.33', '2024-03-15');
    createDonationViaUI('Test Donor 2B', 'test2b@example.com', '44.44', '2024-09-01');

    // Navigate to donations page
    cy.visit('/donations');

    // Should see both donations initially
    cy.contains('$33.33', { timeout: 5000 }).should('be.visible');
    cy.contains('$44.44').should('be.visible');

    // Filter by end date (only old donation - August 1, 2024)
    // Use the second set of spinbuttons (end date) in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('08');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

    // Wait for filtered API call
    cy.wait('@getDonations');

    // Should only see old donation
    cy.contains('$33.33').should('be.visible');
    cy.contains('$44.44').should('not.exist');
  });

  it('filters donations by date range (both start and end)', () => {
    // Create three donations via UI
    createDonationViaUI('Test Donor 3C', 'test3c@example.com', '55.55', '2024-01-15');
    createDonationViaUI('Test Donor 3C', 'test3c@example.com', '66.66', '2024-06-15');
    createDonationViaUI('Test Donor 3C', 'test3c@example.com', '77.77', '2024-09-15');

    // Navigate to donations page
    cy.visit('/donations');

    // Should see all three donations initially
    cy.contains('$55.55', { timeout: 5000 }).should('be.visible');
    cy.contains('$66.66').should('be.visible');
    cy.contains('$77.77').should('be.visible');

    // Filter by date range (only middle donation - May 1 to July 1, 2024)
    // Start date in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('05');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');
    // End date
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('07');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

    // Wait for filtered API call
    cy.wait('@getDonations');

    // Should only see middle donation
    cy.contains('$66.66').should('be.visible');
    cy.contains('$55.55').should('not.exist');
    cy.contains('$77.77').should('not.exist');
  });

  it('clears date filters when clear button is clicked', () => {
    // Create two donations via UI
    createDonationViaUI('Test Donor 4D', 'test4d@example.com', '88.88', '2024-01-01');
    createDonationViaUI('Test Donor 4D', 'test4d@example.com', '99.99', '2024-09-30');

    // Navigate to donations page
    cy.visit('/donations');

    // Verify both donations initially visible
    cy.contains('$88.88', { timeout: 5000 }).should('be.visible');
    cy.contains('$99.99').should('be.visible');

    // Apply date filter (June 1, 2024) in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('06');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

    // Wait for filtered API call
    cy.wait('@getDonations');

    // Only recent donation visible
    cy.contains('$99.99').should('be.visible');
    cy.contains('$88.88').should('not.exist');

    // Clear filters
    cy.contains('button', 'Clear Filters').click();

    // Wait for unfiltered API call
    cy.wait('@getDonations');

    // Both donations should be visible again
    cy.contains('$88.88').should('be.visible');
    cy.contains('$99.99').should('be.visible');

    // Date inputs should be empty (showing placeholder text MM/DD/YYYY) in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').first().should('contain', 'MM');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').first().should('contain', 'DD');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').first().should('contain', 'YYYY');
  });

  it('shows validation error when end date is before start date', () => {
    // Set invalid date range (end before start - Dec 1 start, Jan 1 end)
    // Start date: December 1, 2024 in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('12');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

    // End date: January 1, 2024 (before start date)
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

    // Should show error message
    cy.contains('End date must be after or equal to start date').should(
      'be.visible'
    );

    // Error indicator should be present on DatePicker text fields in Recent Donations section
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="group"]').first().should('have.attr', 'aria-invalid', 'true');
    cy.contains('h2', 'Recent Donations')
      .parent()
      .find('[role="group"]').eq(1).should('have.attr', 'aria-invalid', 'true');
  });

  it('filters donations by donor selection', () => {
    // Use unique names to avoid conflicts with existing test data
    const timestamp = Date.now();
    const aliceName = `Alice TestUser ${timestamp}`;
    const bobName = `Bob TestUser ${timestamp}`;

    // Create donations for two different donors via UI
    createDonationViaUI(aliceName, `alice${timestamp}@example.com`, '111.11', '2024-06-15');
    createDonationViaUI(bobName, `bob${timestamp}@example.com`, '222.22', '2024-06-15');

    // Navigate to donations page
    cy.visit('/donations');

    // Should see both donations initially
    cy.contains('$111.11', { timeout: 5000 }).should('be.visible');
    cy.contains('$222.22').should('be.visible');

    // Filter by donor using autocomplete IN THE RECENT DONATIONS SECTION
    // (not the donor dropdown in the Record Donation form at the top)
    cy.contains('h2', 'Recent Donations')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .type(aliceName);

    // Wait for autocomplete dropdown and options to load
    cy.get('[role="listbox"]').should('be.visible');
    cy.get('[role="option"]').contains(aliceName).should('be.visible');

    // Use keyboard navigation to select (most reliable for MUI Autocomplete)
    cy.contains('h2', 'Recent Donations')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .type('{downarrow}{enter}');

    // Wait for autocomplete to close (confirms selection registered)
    cy.get('[role="listbox"]', { timeout: 10000 }).should('not.exist');

    // Verify the filtered result in UI
    cy.contains('$111.11').should('be.visible');
    cy.contains('$222.22').should('not.exist');

    // Clear filters
    cy.contains('button', 'Clear Filters').click();
    cy.wait('@getDonations');

    // Both donations should be visible again
    cy.contains('$111.11').should('be.visible');
    cy.contains('$222.22').should('be.visible');
  });

  it('filters donations by payment method', () => {
    const timestamp = Date.now();
    const checkDonorName = `Check Donor ${timestamp}`;
    const cashDonorName = `Cash Donor ${timestamp}`;

    // Create donor for check donation
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: checkDonorName, email: `check${timestamp}@example.com` },
    });

    // Create donor for cash donation
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: cashDonorName, email: `cash${timestamp}@example.com` },
    });

    cy.visit('/donations');

    // Create check donation
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .type(checkDonorName);

    cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
    cy.get('[role="option"]').contains(checkDonorName).click();

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Amount')
      .parent()
      .find('input')
      .type('100.00');

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Payment Method')
      .parent()
      .find('[role="combobox"]')
      .click();

    cy.get('[role="option"]').contains('Check').click();

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('button', 'Create Donation')
      .click();

    cy.contains('Donation created successfully', { timeout: 5000 }).should('be.visible');

    // Create cash donation
    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Donor')
      .parent()
      .find('input')
      .clear()
      .type(cashDonorName);

    cy.get('[role="listbox"]', { timeout: 5000 }).should('be.visible');
    cy.get('[role="option"]').contains(cashDonorName).click();

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Amount')
      .parent()
      .find('input')
      .clear()
      .type('200.00');

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('label', 'Payment Method')
      .parent()
      .find('[role="combobox"]')
      .click();

    cy.get('[role="option"]').contains('Cash').click();

    cy.contains('h2', 'Record Donation')
      .parent()
      .contains('button', 'Create Donation')
      .click();

    cy.contains('Donation created successfully', { timeout: 5000 }).should('be.visible');

    // Verify both donations visible initially
    cy.contains('$100.00', { timeout: 5000 }).should('be.visible');
    cy.contains('$200.00').should('be.visible');

    // Filter by payment method: Check
    cy.contains('h2', 'Recent Donations')
      .parent()
      .contains('label', 'Filter by Payment Method')
      .parent()
      .find('[role="combobox"]')
      .click();

    cy.get('[role="option"]').contains('Check').click();

    cy.wait('@getDonations');

    // Only check donation visible
    cy.contains('$100.00').should('be.visible');
    cy.contains('$200.00').should('not.exist');

    // Clear filter
    cy.contains('button', 'Clear Filters').click();
    cy.wait('@getDonations');

    // Both donations visible again
    cy.contains('$100.00').should('be.visible');
    cy.contains('$200.00').should('be.visible');
  });
});
