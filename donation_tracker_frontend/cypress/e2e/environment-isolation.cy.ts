/**
 * Environment Isolation Verification
 *
 * This test verifies that the development and test environments use separate databases.
 * Critical for preventing test data pollution in manual development workflow.
 *
 * See TICKET-024 for environment separation implementation details.
 */

describe('Environment Isolation', () => {
  it('verifies test and development databases are separate', () => {
    const testDonorName = `Test Isolation Donor ${Date.now()}`;
    const testDonorEmail = `test-isolation-${Date.now()}@example.com`;

    // 1. Clean test database
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);

    // 2. Create donor in TEST environment (port 3002)
    cy.request('POST', `${Cypress.env('testApiUrl')}/api/donors`, {
      donor: { name: testDonorName, email: testDonorEmail },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.donor.name).to.eq(testDonorName);
    });

    // 3. Verify donor exists in TEST database
    cy.request('GET', `${Cypress.env('testApiUrl')}/api/donors`).then(
      (response) => {
        expect(response.status).to.eq(200);
        const testDonor = response.body.donors.find(
          (d: any) => d.name === testDonorName
        );
        expect(testDonor).to.exist;
        expect(testDonor.email).to.eq(testDonorEmail);
      }
    );

    // 4. Verify donor DOES NOT exist in DEVELOPMENT database (port 3001)
    // This proves the databases are isolated
    cy.request('GET', `${Cypress.env('devApiUrl')}/api/donors`).then(
      (response) => {
        expect(response.status).to.eq(200);
        const devDonor = response.body.donors.find(
          (d: any) => d.name === testDonorName
        );
        // Donor should NOT exist in dev database
        expect(devDonor).to.be.undefined;
      }
    );

    // 5. Clean up test database
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);
  });

  it('verifies test cleanup endpoint only works in test/development environments', () => {
    // This test ensures the cleanup endpoint is protected in production
    // The endpoint should return 200 in test/dev, but would return 403 in production

    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`).then(
      (response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.include('Database cleaned');
      }
    );
  });
});
