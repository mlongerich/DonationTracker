describe('Donation Date Range Filtering', () => {
  beforeEach(() => {
    // Clean database before each test
    cy.request('DELETE', 'http://localhost:3001/api/test/cleanup');

    // Intercept donations API calls globally for all tests
    cy.intercept('GET', '/api/donations*').as('getDonations');
    cy.visit('/donations');
    // Wait for initial page load
    cy.wait('@getDonations');
  });

  it('filters donations by start date', () => {
    // Create test donations with unique amounts
    cy.request('POST', 'http://localhost:3001/api/donors', {
      donor: { name: 'Test Donor 1A', email: 'test1a@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.id;

      // Create old donation
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 11.11,
          date: '2024-01-01',
          donor_id: donorId,
        },
      });

      // Create recent donation
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 22.22,
          date: '2024-10-01',
          donor_id: donorId,
        },
      });

      // Reload to fetch new donations
      cy.reload();
      cy.wait('@getDonations');

      // Should see both donations initially
      cy.contains('$11.11', { timeout: 5000 }).should('be.visible');
      cy.contains('$22.22').should('be.visible');

      // Filter by start date (only recent donation - September 1, 2024)
      // DatePicker uses segmented spinbutton inputs
      cy.get('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('09');
      cy.get('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
      cy.get('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

      // Wait for filtered API call
      cy.wait('@getDonations');

      // Should only see recent donation
      cy.contains('$22.22').should('be.visible');
      cy.contains('$11.11').should('not.exist');
    });
  });

  it('filters donations by end date', () => {
    cy.request('POST', 'http://localhost:3001/api/donors', {
      donor: { name: 'Test Donor 2B', email: 'test2b@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.id;

      // Create old donation
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 33.33,
          date: '2024-03-15',
          donor_id: donorId,
        },
      });

      // Create recent donation
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 44.44,
          date: '2024-09-01',
          donor_id: donorId,
        },
      });

      // Reload to fetch new donations
      cy.reload();
      cy.wait('@getDonations');

      // Should see both donations initially
      cy.contains('$33.33', { timeout: 5000 }).should('be.visible');
      cy.contains('$44.44').should('be.visible');

      // Filter by end date (only old donation - August 1, 2024)
      // Use the second set of spinbuttons (end date)
      cy.get('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('08');
      cy.get('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
      cy.get('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

      // Wait for filtered API call
      cy.wait('@getDonations');

      // Should only see old donation
      cy.contains('$33.33').should('be.visible');
      cy.contains('$44.44').should('not.exist');
    });
  });

  it('filters donations by date range (both start and end)', () => {
    cy.request('POST', 'http://localhost:3001/api/donors', {
      donor: { name: 'Test Donor 3C', email: 'test3c@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.id;

      // Create three donations at different times
      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 55.55,
          date: '2024-01-15',
          donor_id: donorId,
        },
      });

      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 66.66,
          date: '2024-06-15',
          donor_id: donorId,
        },
      });

      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 77.77,
          date: '2024-09-15',
          donor_id: donorId,
        },
      });

      // Reload to fetch new donations
      cy.reload();
      cy.wait('@getDonations');

      // Should see all three donations initially
      cy.contains('$55.55', { timeout: 5000 }).should('be.visible');
      cy.contains('$66.66').should('be.visible');
      cy.contains('$77.77').should('be.visible');

      // Filter by date range (only middle donation - May 1 to July 1, 2024)
      // Start date
      cy.get('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('05');
      cy.get('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
      cy.get('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');
      // End date
      cy.get('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('07');
      cy.get('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
      cy.get('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

      // Wait for filtered API call
      cy.wait('@getDonations');

      // Should only see middle donation
      cy.contains('$66.66').should('be.visible');
      cy.contains('$55.55').should('not.exist');
      cy.contains('$77.77').should('not.exist');
    });
  });

  it('clears date filters when clear button is clicked', () => {
    cy.request('POST', 'http://localhost:3001/api/donors', {
      donor: { name: 'Test Donor 4D', email: 'test4d@example.com' },
    }).then((donorResponse) => {
      const donorId = donorResponse.body.id;

      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 88.88,
          date: '2024-01-01',
          donor_id: donorId,
        },
      });

      cy.request('POST', 'http://localhost:3001/api/donations', {
        donation: {
          amount: 99.99,
          date: '2024-09-30',
          donor_id: donorId,
        },
      });

      // Reload to fetch new donations
      cy.reload();
      cy.wait('@getDonations');

      // Verify both donations initially visible
      cy.contains('$88.88', { timeout: 5000 }).should('be.visible');
      cy.contains('$99.99').should('be.visible');

      // Apply date filter (June 1, 2024)
      cy.get('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('06');
      cy.get('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
      cy.get('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

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

      // Date inputs should be empty (showing placeholder text MM/DD/YYYY)
      cy.get('[role="spinbutton"][aria-label="Month"]').first().should('contain', 'MM');
      cy.get('[role="spinbutton"][aria-label="Day"]').first().should('contain', 'DD');
      cy.get('[role="spinbutton"][aria-label="Year"]').first().should('contain', 'YYYY');
    });
  });

  it('shows validation error when end date is before start date', () => {
    // Set invalid date range (end before start - Dec 1 start, Jan 1 end)
    // Start date: December 1, 2024
    cy.get('[role="spinbutton"][aria-label="Month"]').first().click().clear().type('12');
    cy.get('[role="spinbutton"][aria-label="Day"]').first().clear().type('01');
    cy.get('[role="spinbutton"][aria-label="Year"]').first().clear().type('2024');

    // End date: January 1, 2024 (before start date)
    cy.get('[role="spinbutton"][aria-label="Month"]').eq(1).click().clear().type('01');
    cy.get('[role="spinbutton"][aria-label="Day"]').eq(1).clear().type('01');
    cy.get('[role="spinbutton"][aria-label="Year"]').eq(1).clear().type('2024');

    // Should show error message
    cy.contains('End date must be after or equal to start date').should(
      'be.visible'
    );

    // Error indicator should be present on DatePicker text fields
    cy.get('[role="group"]').first().should('have.attr', 'aria-invalid', 'true');
    cy.get('[role="group"]').eq(1).should('have.attr', 'aria-invalid', 'true');
  });

  it('filters donations by donor selection', () => {
    // Use unique names to avoid conflicts with existing test data
    const timestamp = Date.now();
    const aliceName = `Alice TestUser ${timestamp}`;
    const bobName = `Bob TestUser ${timestamp}`;

    // Create two donors with donations
    cy.request('POST', 'http://localhost:3001/api/donors', {
      donor: { name: aliceName, email: `alice${timestamp}@example.com` },
    }).then((aliceResponse) => {
      const aliceId = aliceResponse.body.id;

      cy.request('POST', 'http://localhost:3001/api/donors', {
        donor: { name: bobName, email: `bob${timestamp}@example.com` },
      }).then((bobResponse) => {
        const bobId = bobResponse.body.id;

        // Create donations for each donor
        cy.request('POST', 'http://localhost:3001/api/donations', {
          donation: {
            amount: 111.11,
            date: '2024-06-15',
            donor_id: aliceId,
          },
        });

        cy.request('POST', 'http://localhost:3001/api/donations', {
          donation: {
            amount: 222.22,
            date: '2024-06-15',
            donor_id: bobId,
          },
        });

        // Reload to fetch new donations
        cy.reload();
        cy.wait('@getDonations');

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
          .type(`Alice TestUser ${timestamp}`);

        // Wait for autocomplete dropdown and options to load
        cy.get('[role="listbox"]').should('be.visible');
        cy.get('[role="option"]').contains(`Alice TestUser ${timestamp}`).should('be.visible');

        // Use keyboard navigation to select (most reliable for MUI Autocomplete)
        cy.contains('h2', 'Recent Donations')
          .parent()
          .contains('label', 'Donor')
          .parent()
          .find('input')
          .type('{downarrow}{enter}');

        // Wait for autocomplete to close (confirms selection registered)
        cy.get('[role="listbox"]').should('not.exist');

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
    });
  });
});
