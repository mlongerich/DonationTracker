describe('Last Donation Date Display', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
  });

  describe('Donor Last Donation Date', () => {
    it('displays last donation date when donor has donations', () => {
      // Create donor
      cy.visit('/donors');
      const donorName = `Test Donor ${Date.now()}`;
      cy.get('input[type="text"]').first().type(donorName);
      cy.get('input[type="email"]').first().type(`test${Date.now()}@example.com`);
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

      // Create donation for this donor
      cy.visit('/donations');
      cy.get('input[type="number"]').type('100.00');

      // Select today's date (should be default, but ensure it's set)
      const today = new Date().toISOString().split('T')[0];
      cy.get('input[type="date"]').clear().type(today);

      // Select donor from autocomplete
      cy.contains('label', 'Donor')
        .parent()
        .find('input')
        .click()
        .type(donorName);
      cy.get('[role="option"]', { timeout: 10000 }).first().click();

      // Submit donation
      cy.contains('button', /create donation/i).click();
      cy.contains(/donation created successfully/i, { timeout: 10000 }).should('be.visible');

      // Navigate back to donors page
      cy.visit('/donors');

      // Verify last donation date is displayed
      cy.contains(donorName)
        .parent()
        .parent()
        .parent()
        .contains(`Last Donation: ${today}`)
        .should('be.visible');
    });

    it('displays "No donations yet" when donor has no donations', () => {
      // Create donor without donations
      cy.visit('/donors');
      const donorName = `No Donations Donor ${Date.now()}`;
      cy.get('input[type="text"]').first().type(donorName);
      cy.get('input[type="email"]').first().type(`nodonations${Date.now()}@example.com`);
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

      // Verify "No donations yet" is displayed
      cy.contains(donorName)
        .parent()
        .parent()
        .parent()
        .contains('Last Donation: No donations yet')
        .should('be.visible');
    });
  });

  describe('Child Last Donation Date', () => {
    it('displays last donation date when child has donations through sponsorship', () => {
      // Create donor
      cy.visit('/donors');
      const donorName = `Sponsor ${Date.now()}`;
      cy.get('input[type="text"]').first().type(donorName);
      cy.get('input[type="email"]').first().type(`sponsor${Date.now()}@example.com`);
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

      // Create child
      cy.visit('/children');
      const childName = `Child ${Date.now()}`;
      cy.contains('h2', 'Add Child')
        .parent()
        .find('input[type="text"]')
        .first()
        .type(childName);
      cy.contains('h2', 'Add Child')
        .parent()
        .contains('button', /submit/i)
        .click();
      cy.contains(childName, { timeout: 10000 }).should('be.visible');

      // Create sponsorship
      cy.visit('/sponsorships');
      cy.get('input[type="text"]').first().type(donorName.substring(0, 10));
      cy.wait(1000);
      cy.contains(donorName).click();
      cy.get('input[type="text"]').eq(1).type(childName.substring(0, 10));
      cy.wait(1000);
      cy.contains(childName).click();
      cy.wait(500);
      cy.get('input[type="number"]').type('{selectall}50');
      cy.contains('button', /submit/i).click();
      cy.contains(donorName, { timeout: 10000 }).should('be.visible');

      // Create donation for sponsorship
      cy.visit('/donations');
      cy.get('input[type="number"]').type('50.00');

      const today = new Date().toISOString().split('T')[0];
      cy.get('input[type="date"]').clear().type(today);

      // Select donor
      cy.contains('label', 'Donor')
        .parent()
        .find('input')
        .click()
        .type(donorName.substring(0, 10));
      cy.get('[role="option"]', { timeout: 10000 }).first().click();

      // Select child from "Donation For" autocomplete
      cy.contains('label', 'Donation For')
        .parent()
        .find('input')
        .click()
        .type(childName.substring(0, 10));
      cy.wait(1000);
      cy.get('[role="option"]').contains(childName).click();

      cy.contains('button', /create donation/i).click();
      cy.contains(/donation created successfully/i, { timeout: 10000 }).should('be.visible');

      // Navigate to children page
      cy.visit('/children');

      // Verify last donation date is displayed
      cy.contains(childName)
        .parent()
        .parent()
        .parent()
        .contains(`Last Donation: ${today}`)
        .should('be.visible');
    });

    it('displays "No donations yet" when child has no donations', () => {
      // Create child without donations
      cy.visit('/children');
      const childName = `No Donations Child ${Date.now()}`;
      cy.contains('h2', 'Add Child')
        .parent()
        .find('input[type="text"]')
        .first()
        .type(childName);
      cy.contains('h2', 'Add Child')
        .parent()
        .contains('button', /submit/i)
        .click();
      cy.contains(childName, { timeout: 10000 }).should('be.visible');

      // Verify "No donations yet" is displayed
      cy.contains(childName)
        .parent()
        .parent()
        .parent()
        .contains('Last Donation: No donations yet')
        .should('be.visible');
    });
  });

  describe('Sponsorship Last Donation Date', () => {
    it('displays last donation date in sponsorships table when donations exist', () => {
      // Create donor
      cy.visit('/donors');
      const donorName = `Table Donor ${Date.now()}`;
      cy.get('input[type="text"]').first().type(donorName);
      cy.get('input[type="email"]').first().type(`table${Date.now()}@example.com`);
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

      // Create child
      cy.visit('/children');
      const childName = `Table Child ${Date.now()}`;
      cy.contains('h2', 'Add Child')
        .parent()
        .find('input[type="text"]')
        .first()
        .type(childName);
      cy.contains('h2', 'Add Child')
        .parent()
        .contains('button', /submit/i)
        .click();
      cy.contains(childName, { timeout: 10000 }).should('be.visible');

      // Create sponsorship
      cy.visit('/sponsorships');
      cy.get('input[type="text"]').first().type(donorName.substring(0, 10));
      cy.wait(1000);
      cy.contains(donorName).click();
      cy.get('input[type="text"]').eq(1).type(childName.substring(0, 10));
      cy.wait(1000);
      cy.contains(childName).click();
      cy.wait(500);
      cy.get('input[type="number"]').type('{selectall}75');
      cy.contains('button', /submit/i).click();
      cy.contains(donorName, { timeout: 10000 }).should('be.visible');

      // Create donation for sponsorship
      cy.visit('/donations');
      cy.get('input[type="number"]').type('75.00');

      const today = new Date().toISOString().split('T')[0];
      cy.get('input[type="date"]').clear().type(today);

      cy.contains('label', 'Donor')
        .parent()
        .find('input')
        .click()
        .type(donorName.substring(0, 10));
      cy.get('[role="option"]', { timeout: 10000 }).first().click();

      cy.contains('label', 'Donation For')
        .parent()
        .find('input')
        .click()
        .type(childName.substring(0, 10));
      cy.wait(1000);
      cy.get('[role="option"]').contains(childName).click();

      cy.contains('button', /create donation/i).click();
      cy.contains(/donation created successfully/i, { timeout: 10000 }).should('be.visible');

      // Navigate to sponsorships page
      cy.visit('/sponsorships');

      // Verify last donation date appears in table
      cy.contains('tr', donorName)
        .contains(today)
        .should('be.visible');
    });

    it('displays "No donations yet" in sponsorships table when no donations exist', () => {
      // Create donor
      cy.visit('/donors');
      const donorName = `Empty Sponsor ${Date.now()}`;
      cy.get('input[type="text"]').first().type(donorName);
      cy.get('input[type="email"]').first().type(`empty${Date.now()}@example.com`);
      cy.contains('button', /submit/i).click();
      cy.contains(/donor (created|updated) successfully/i, { timeout: 10000 }).should('be.visible');

      // Create child
      cy.visit('/children');
      const childName = `Empty Child ${Date.now()}`;
      cy.contains('h2', 'Add Child')
        .parent()
        .find('input[type="text"]')
        .first()
        .type(childName);
      cy.contains('h2', 'Add Child')
        .parent()
        .contains('button', /submit/i)
        .click();
      cy.contains(childName, { timeout: 10000 }).should('be.visible');

      // Create sponsorship without donation
      cy.visit('/sponsorships');
      cy.get('input[type="text"]').first().type(donorName.substring(0, 10));
      cy.wait(1000);
      cy.contains(donorName).click();
      cy.get('input[type="text"]').eq(1).type(childName.substring(0, 10));
      cy.wait(1000);
      cy.contains(childName).click();
      cy.wait(500);
      cy.get('input[type="number"]').type('{selectall}25');
      cy.contains('button', /submit/i).click();
      cy.contains(donorName, { timeout: 10000 }).should('be.visible');

      // Verify "No donations yet" appears in table
      cy.contains('tr', donorName)
        .contains('No donations yet')
        .should('be.visible');
    });
  });
});
