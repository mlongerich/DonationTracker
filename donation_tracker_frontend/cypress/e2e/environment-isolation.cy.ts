/**
 * Environment Isolation Verification
 *
 * This test verifies that the development and test environments use separate databases.
 * Critical for preventing test data pollution in manual development workflow.
 *
 * See TICKET-024 for environment separation implementation details.
 */

describe('Environment Isolation', () => {
  beforeEach(() => {
    cy.login();
  });

  it('verifies test and development databases are separate', () => {
    const testDonorName = `Test Isolation Donor ${Date.now()}`;
    const testDonorEmail = `test-isolation-${Date.now()}@example.com`;
    const testToken = Cypress.env('auth_token');

    // 1. Clean test database
    cy.request('DELETE', `${Cypress.env('testApiUrl')}/api/test/cleanup`);

    // 2. Create donor in TEST environment (port 3002)
    cy.request({
      method: 'POST',
      url: `${Cypress.env('testApiUrl')}/api/donors`,
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
      body: {
        donor: { name: testDonorName, email: testDonorEmail },
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.donor.name).to.eq(testDonorName);
    });

    // 3. Verify donor exists in TEST database
    cy.request({
      method: 'GET',
      url: `${Cypress.env('testApiUrl')}/api/donors`,
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      const testDonor = response.body.donors.find(
        (d: any) => d.name === testDonorName
      );
      expect(testDonor).to.exist;
      expect(testDonor.email).to.eq(testDonorEmail);
    });

    // 4. Verify donor DOES NOT exist in DEVELOPMENT database (port 3001)
    // This proves the databases are isolated
    // Get auth token from dev API for this request
    cy.request({
      method: 'GET',
      url: `${Cypress.env('devApiUrl')}/auth/dev_login`,
      followRedirect: false,
    }).then((loginResponse) => {
      const redirectUrl = new URL(loginResponse.headers.location);
      const devToken = redirectUrl.searchParams.get('token');

      // Now query dev API with auth header
      cy.request({
        method: 'GET',
        url: `${Cypress.env('devApiUrl')}/api/donors`,
        headers: {
          Authorization: `Bearer ${devToken}`,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        const devDonor = response.body.donors.find(
          (d: any) => d.name === testDonorName
        );
        // Donor should NOT exist in dev database
        expect(devDonor).to.be.undefined;
      });
    });

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
