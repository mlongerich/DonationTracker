describe('Donor Edit Workflow', () => {
  beforeEach(() => {
    cy.login();
    cy.clearDonors();
    cy.visit('/donors');
  });

  it('displays edit button for each donor in the list', () => {
    cy.createDonor('Test Donor', 'test@example.com');
    cy.get('button[aria-label="edit"]').should('exist');
  });

  it('pre-fills form with donor data when edit button is clicked', () => {
    cy.createDonor('Jane Smith', 'jane@example.com');
    cy.clickEditDonor();
    cy.verifyFormPreFilled('Jane Smith', 'jane@example.com');
  });

  it('changes heading to "Edit Donor" when editing', () => {
    cy.contains('h2', 'Add Donor').should('be.visible');
    cy.createDonor('Bob Johnson', 'bob@example.com');
    cy.clickEditDonor();
    cy.contains('h2', 'Edit Donor').should('be.visible');
    cy.contains('h2', 'Add Donor').should('not.exist');
  });

  it('changes button text to "Update" when editing', () => {
    cy.createDonor('Alice Williams', 'alice@example.com');
    cy.clickEditDonor();
    cy.contains('button', /update/i).should('be.visible');
    cy.contains('button', /^submit$/i).should('not.exist');
  });

  it('highlights the donor row when editing', () => {
    cy.createDonor('Sarah Connor', 'sarah@example.com');
    cy.clickEditDonor();
    cy.get('[data-testid="donor-row"]').first().should('have.class', 'editing');
  });

  it('shows Cancel button when editing', () => {
    cy.contains('button', /cancel/i).should('not.exist');
    cy.createDonor('Kyle Reese', 'kyle@example.com');
    cy.clickEditDonor();
    cy.contains('button', /cancel/i).should('be.visible');
  });

  it('cancels editing and clears form state', () => {
    cy.createDonor('John Connor', 'john@example.com');
    cy.clickEditDonor();
    cy.contains('h2', 'Edit Donor').should('be.visible');
    cy.contains('button', /cancel/i).click();
    cy.contains('h2', 'Add Donor').should('be.visible');
    cy.contains('button', /^submit$/i).should('be.visible');
    cy.get('input[type="text"]').first().should('have.value', '');
    cy.get('input[type="email"]').should('have.value', '');
  });

  it('updates donor with new data', () => {
    cy.createDonor('Marcus Wright', 'marcus@example.com');
    cy.clickEditDonor();
    cy.get('input[type="text"]').first().clear().type('Marcus Updated');
    cy.get('input[type="email"]').clear().type('marcus.updated@example.com');
    cy.contains('button', /update/i).click();
    cy.contains(/donor (created|updated) successfully/i, {
      timeout: 10000,
    }).should('be.visible');
    cy.contains('Marcus Updated').should('be.visible');
    cy.contains('marcus.updated@example.com').should('be.visible');
    cy.contains('marcus@example.com').should('not.exist');
  });
});
