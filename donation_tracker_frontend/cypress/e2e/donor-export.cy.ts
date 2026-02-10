describe('Donor CSV Export', () => {
  beforeEach(() => {
    cy.login();
    cy.clearDonors();
    cy.visit('/admin');
    cy.contains('Donation Tracker').should('be.visible');
  });

  it('downloads CSV file when Export All Donors button is clicked', () => {
    // Click on CSV tab
    cy.contains('button[role="tab"]', /^csv$/i).click();

    // Set up intercept before clicking button
    cy.intercept('GET', '/api/donors/export*').as('exportRequest');

    // Click Export All Donors to CSV button
    cy.contains('button', /export all donors to csv/i).click();

    // Verify file download was initiated (check for network request)
    cy.wait('@exportRequest').then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      expect(interception.response?.headers['content-type']).to.include('text/csv');
    });
  });
});
