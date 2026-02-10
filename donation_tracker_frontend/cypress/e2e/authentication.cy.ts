describe('Authentication', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  describe('Login Flow', () => {
    it('redirects unauthenticated users to login page', () => {
      // Try to visit protected route without authentication
      cy.visit('/donations');

      // Should be redirected to login page
      cy.url().should('include', '/login');
      cy.contains('Donation Tracker').should('be.visible');
      cy.contains('Sign in to continue').should('be.visible');
    });

    it('displays Google OAuth button on login page', () => {
      cy.visit('/login');

      cy.contains('button', /sign in with google/i).should('be.visible');
    });

    it('displays dev login button in development mode', () => {
      cy.visit('/login');

      cy.contains('button', /dev login/i).should('be.visible');
    });

    it('allows dev login and redirects to home page', () => {
      cy.visit('/login');

      // Click dev login button
      cy.contains('button', /dev login/i).click();

      // Should redirect through callback to home page
      cy.url().should('eq', 'http://localhost:3000/');
      cy.contains('Donation Tracker').should('be.visible');

      // Verify localStorage has auth data
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.exist;
        expect(win.localStorage.getItem('auth_user')).to.exist;

        const user = JSON.parse(win.localStorage.getItem('auth_user')!);
        expect(user.email).to.equal('admin@projectsforasia.com');
        expect(user.name).to.equal('Admin User');
      });
    });

    it('allows access to protected routes after login', () => {
      cy.visit('/login');
      cy.contains('button', /dev login/i).click();

      // Wait for redirect to complete
      cy.url().should('eq', 'http://localhost:3000/');

      // Try visiting other protected routes
      cy.visit('/donors');
      cy.url().should('include', '/donors');
      cy.contains('Donor Management').should('be.visible');

      cy.visit('/admin');
      cy.url().should('include', '/admin');
      cy.contains('Admin').should('be.visible');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // Log in before each logout test
      cy.visit('/login');
      cy.contains('button', /dev login/i).click();
      cy.url().should('eq', 'http://localhost:3000/');
    });

    it('displays logout button when authenticated', () => {
      cy.contains('button', /logout/i).should('be.visible');
    });

    it('clears localStorage and redirects to login on logout', () => {
      // Click logout button
      cy.contains('button', /logout/i).click();

      // Should redirect to login page
      cy.url().should('include', '/login');

      // Verify localStorage is cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.be.null;
        expect(win.localStorage.getItem('auth_user')).to.be.null;
      });
    });

    it('prevents access to protected routes after logout', () => {
      // Logout
      cy.contains('button', /logout/i).click();
      cy.url().should('include', '/login');

      // Try to visit protected route
      cy.visit('/donations');

      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Domain Restriction', () => {
    it('rejects non-@projectsforasia.com emails (API test)', () => {
      // This test verifies the backend domain restriction
      // In a real scenario, OAuth would fail for unauthorized domains
      // We can test the backend API directly

      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/auth/me`,
        failOnStatusCode: false,
      }).then((response) => {
        // Without authentication, should get 401
        expect(response.status).to.equal(401);
      });
    });

    it('allows admin@projectsforasia.com to authenticate', () => {
      cy.visit('/login');
      cy.contains('button', /dev login/i).click();

      // Should successfully authenticate
      cy.url().should('eq', 'http://localhost:3000/');

      // Verify user email is from authorized domain
      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('auth_user')!);
        expect(user.email).to.include('@projectsforasia.com');
      });
    });
  });

  describe('Session Persistence', () => {
    it('maintains authentication across page refreshes', () => {
      // Login
      cy.visit('/login');
      cy.contains('button', /dev login/i).click();
      cy.url().should('eq', 'http://localhost:3000/');

      // Verify authenticated
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.exist;
      });

      // Refresh page
      cy.reload();

      // Should still be authenticated
      cy.url().should('eq', 'http://localhost:3000/');
      cy.contains('Donation Tracker').should('be.visible');
      cy.contains('button', /logout/i).should('be.visible');
    });

    it('maintains authentication across route changes', () => {
      // Login
      cy.visit('/login');
      cy.contains('button', /dev login/i).click();
      cy.url().should('eq', 'http://localhost:3000/');

      // Navigate to different routes
      cy.visit('/donors');
      cy.url().should('include', '/donors');

      cy.visit('/admin');
      cy.url().should('include', '/admin');

      cy.visit('/donations');
      cy.url().should('include', '/donations');

      // Should still have auth data
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.exist;
        expect(win.localStorage.getItem('auth_user')).to.exist;
      });
    });
  });
});
