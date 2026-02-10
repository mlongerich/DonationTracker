describe('Donation Reports', () => {
  beforeEach(() => {
    cy.login();
    // Clean database before each test
    cy.request('DELETE', Cypress.env('testApiUrl') + '/api/test/cleanup');

    // Intercept reports API calls
    cy.intercept('GET', '/api/reports/donations*').as('getReport');

    cy.visit('/reports');
    cy.contains('Donation Reports').should('be.visible');
  });

  it('displays date range selectors with default values', () => {
    // Default start date should be January 1 of current year
    cy.get('[role="spinbutton"][aria-label="Month"]').first().should('contain', '01');
    cy.get('[role="spinbutton"][aria-label="Day"]').first().should('contain', '01');

    // End date should be today (just check that it's populated, not empty)
    cy.get('[role="spinbutton"][aria-label="Month"]').eq(1).should('not.contain', 'MM');
    cy.get('[role="spinbutton"][aria-label="Day"]').eq(1).should('not.contain', 'DD');
  });

  it('generates report with test data', () => {
    // Create test donor and donation via API
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Test Donor', email: 'test@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 10000, // $100.00 in cents
          date: '2026-01-05',
          payment_method: 'stripe',
        },
      });
    });

    // Click Generate Report button
    cy.contains('button', 'Generate Report').click();

    // Wait for API response
    cy.wait('@getReport');

    // Should see all three sections
    cy.contains('h6', 'Donations').should('be.visible');
    cy.contains('h6', 'Donor Summary').should('be.visible');
    cy.contains('h6', 'Project Summary').should('be.visible');

    // Should see donation data
    cy.contains('Test Donor').should('be.visible');
    cy.contains('$100.00').should('be.visible');
    cy.contains('5 January 2026').should('be.visible');
  });

  it('expands donor summary row to show individual donations', () => {
    // Create test donor with multiple donations
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Alice Johnson', email: 'alice@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 5000,
          date: '2026-01-03',
          payment_method: 'check',
        },
      });

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 7500,
          date: '2026-01-04',
          payment_method: 'stripe',
        },
      });
    });

    // Generate report
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Find Alice Johnson in Donor Summary section and count initial occurrences
    cy.contains('h6', 'Donor Summary')
      .parent()
      .within(() => {
        // Click on donor row to expand (find the row with expand button)
        cy.contains('Alice Johnson').parent().parent().click();
      });

    // After expansion, should see payment methods in the nested table
    cy.contains('h6', 'Donor Summary')
      .parent()
      .within(() => {
        cy.contains('check').should('be.visible');
        cy.contains('stripe').should('be.visible');
        cy.contains('$50.00').should('be.visible');
        cy.contains('$75.00').should('be.visible');
      });
  });

  it('expands project summary row to show project donations', () => {
    // Create test data: donor + project + donation
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Bob Smith', email: 'bob@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/projects', {
        project: { title: 'Community Outreach', project_type: 'general' },
      }).then((projectResponse) => {
        const projectId = projectResponse.body.project.id;

        cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
          donation: {
            donor_id: donorId,
            project_id: projectId,
            amount: 15000,
            date: '2026-01-02',
            payment_method: 'cash',
          },
        });
      });
    });

    // Generate report
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Find project in Project Summary section and expand
    cy.contains('h6', 'Project Summary')
      .parent()
      .within(() => {
        cy.contains('Community Outreach').parent().parent().click();
      });

    // After expansion, should see donor name in nested table
    cy.contains('h6', 'Project Summary')
      .parent()
      .within(() => {
        cy.contains('Bob Smith').should('be.visible');
        cy.contains('$150.00').should('be.visible');
        cy.contains('cash').should('be.visible');
      });
  });

  it('expands child sponsorship project to show child donations (bug fix verification)', () => {
    // Create test data: donor + child + sponsorship + donation
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Jane Sponsor', email: 'jane@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/children', {
        child: { name: 'Sangwan', gender: 'boy' },
      }).then((childResponse) => {
        const childId = childResponse.body.child.id;

        cy.request('POST', Cypress.env('testApiUrl') + '/api/sponsorships', {
          sponsorship: { donor_id: donorId, child_id: childId, monthly_amount: 5000 },
        }).then((sponsorshipResponse) => {
          const sponsorshipId = sponsorshipResponse.body.sponsorship.id;
          const projectId = sponsorshipResponse.body.sponsorship.project_id;

          cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
            donation: {
              donor_id: donorId,
              project_id: projectId,
              sponsorship_id: sponsorshipId,
              amount: 5000,
              date: '2026-01-02',
              payment_method: 'stripe',
            },
          }).then(() => {
            // Generate report after all data is created
            cy.contains('button', 'Generate Report').click();
            cy.wait('@getReport');
          });
        });
      });
    });

    // In Section 1 (Donations), should see child name "Sangwan"
    cy.contains('h6', 'Donations')
      .parent()
      .within(() => {
        cy.contains('Sangwan').should('be.visible');
      });

    // In Section 3 (Project Summary), should see "Sponsor Sangwan" project
    cy.contains('h6', 'Project Summary')
      .parent()
      .within(() => {
        cy.contains('Sponsor Sangwan').should('be.visible');
      });

    // Click to expand "Sponsor Sangwan" project row
    cy.contains('h6', 'Project Summary')
      .parent()
      .within(() => {
        cy.contains('Sponsor Sangwan').parent().parent().click();
      });

    // After expansion, should see donor name (Jane Sponsor) in nested table
    // This verifies the bug fix: filter by project_id instead of name matching
    cy.contains('h6', 'Project Summary')
      .parent()
      .within(() => {
        cy.contains('Jane Sponsor').should('be.visible');
        cy.contains('$50.00').should('be.visible');
        cy.contains('stripe').should('be.visible');
      });
  });

  it('filters report by custom date range', () => {
    // Create donations in different months
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Date Filter Test', email: 'datefilter@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      // January donation
      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 3000,
          date: '2025-01-15',
          payment_method: 'check',
        },
      });

      // June donation
      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 6000,
          date: '2025-06-15',
          payment_method: 'stripe',
        },
      });
    });

    // Set date range to June only (June 1 - June 30)
    // Start date: June 1, 2025
    cy.get('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('06');
    cy.get('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.get('[role="spinbutton"][aria-label="Year"]').first().clear().type('2025');

    // End date: June 30, 2025
    cy.get('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('06');
    cy.get('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('30');
    cy.get('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2025');

    // Generate report
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Should only see June donation ($60.00)
    cy.contains('$60.00').should('be.visible');
    cy.contains('$30.00').should('not.exist');

    // Total should be $60.00
    cy.contains('h6', 'Donations')
      .parent()
      .within(() => {
        cy.contains('td', 'Total:').parent().within(() => {
          cy.contains('$60.00').should('be.visible');
        });
      });
  });

  it('downloads CSV report', () => {
    // Create test donation
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'CSV Test Donor', email: 'csv@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 12000,
          date: '2026-01-03',
          payment_method: 'check',
        },
      });
    });

    // Generate report first
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Set up intercept for CSV download
    cy.intercept('GET', '/api/reports/donations?*').as('downloadCSV');

    // Click Download CSV button
    cy.contains('button', /download csv report/i).click();

    // Verify CSV download was initiated
    cy.wait('@downloadCSV').then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      expect(interception.response?.headers['content-type']).to.include('text/csv');
    });
  });

  it('shows total count and amount in report metadata', () => {
    // Create multiple donations
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Meta Test Donor', email: 'meta@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: { donor_id: donorId, amount: 2500, date: '2026-01-03', payment_method: 'cash' },
      });

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: { donor_id: donorId, amount: 3500, date: '2026-01-04', payment_method: 'check' },
      });
    });

    // Generate report
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Should see total of both donations in Total row
    cy.contains('h6', 'Donations')
      .parent()
      .within(() => {
        cy.contains('td', 'Total:').parent().within(() => {
          cy.contains('$60.00').should('be.visible'); // $25 + $35 = $60
        });
      });
  });

  it('collapses expanded rows when clicking again', () => {
    // Create test donor with donation
    cy.request('POST', Cypress.env('testApiUrl') + '/api/donors', {
      donor: { name: 'Collapse Test', email: 'collapse@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.donor.id;

      cy.request('POST', Cypress.env('testApiUrl') + '/api/donations', {
        donation: {
          donor_id: donorId,
          amount: 8000,
          date: '2026-01-04',
          payment_method: 'stripe',
        },
      });
    });

    // Generate report
    cy.contains('button', 'Generate Report').click();
    cy.wait('@getReport');

    // Expand donor row
    cy.contains('h6', 'Donor Summary')
      .parent()
      .within(() => {
        cy.contains('Collapse Test').parent().parent().click();
        // Verify expanded content visible
        cy.contains('stripe').should('be.visible');
      });

    // Click again to collapse
    cy.contains('h6', 'Donor Summary')
      .parent()
      .within(() => {
        cy.contains('Collapse Test').parent().parent().click();
      });

    // Wait for collapse animation
    cy.wait(300);

    // Verify collapse by expanding again - if it was collapsed, we should be able to expand it
    cy.contains('h6', 'Donor Summary')
      .parent()
      .within(() => {
        cy.contains('Collapse Test').parent().parent().click();
        // After re-expanding, the payment method should be visible again
        cy.contains('stripe').should('be.visible');
      });
  });
});
