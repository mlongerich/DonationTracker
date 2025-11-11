describe('Stripe Donation Badge Display', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
  });

  it('displays Stripe badge for donations created via Stripe import', () => {
    const timestamp = Date.now();
    const donorName = `Stripe Donor ${timestamp}`;
    const donorEmail = `stripe${timestamp}@example.com`;

    // Create a donor first
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: donorName, email: donorEmail },
    }).then((response) => {
      const donorId = response.body.donor.id;

      // Create a Stripe donation directly via API (simulating import)
      // The backend should automatically set payment_method to 'stripe'
      cy.request('POST', `${Cypress.env('testApiUrl')}/api/donations`, {
        donation: {
          donor_id: donorId,
          amount: 5000, // $50.00 in cents
          date: '2024-11-11',
          payment_method: 'stripe',
          stripe_charge_id: 'ch_test_123456',
          stripe_customer_id: 'cus_test_123456',
        },
      });
    });

    // Visit donations page
    cy.visit('/donations');

    // Wait for donations to load
    cy.contains('$50.00', { timeout: 5000 }).should('be.visible');

    // Verify Stripe badge appears
    cy.contains('$50.00').parent().parent().contains('Stripe').should('be.visible');
  });

  it('does not display Stripe badge for manual donations', () => {
    const timestamp = Date.now();
    const donorName = `Manual Donor ${timestamp}`;
    const donorEmail = `manual${timestamp}@example.com`;

    // Create a donor first
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: donorName, email: donorEmail },
    }).then((response) => {
      const donorId = response.body.donor.id;

      // Create a manual check donation
      cy.request('POST', `${Cypress.env('testApiUrl')}/api/donations`, {
        donation: {
          donor_id: donorId,
          amount: 3000, // $30.00 in cents
          date: '2024-11-11',
          payment_method: 'check',
        },
      });
    });

    // Visit donations page
    cy.visit('/donations');

    // Wait for donations to load
    cy.contains('$30.00', { timeout: 5000 }).should('be.visible');

    // Verify Check badge appears (not Stripe)
    cy.contains('$30.00').parent().parent().contains('Check').should('be.visible');
    cy.contains('$30.00').parent().parent().contains('Stripe').should('not.exist');
  });
});
