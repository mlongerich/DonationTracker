describe('Project Management', () => {
  beforeEach(() => {
    // Visit projects page
    cy.visit('/projects');
  });

  it('displays the Projects page with form and list', () => {
    cy.contains('Manage Projects').should('be.visible');

    // Verify project form is visible
    cy.contains('label', /title/i).should('be.visible');
    cy.contains('label', /description/i).should('be.visible');
    cy.contains('label', /project type/i).should('be.visible');
    cy.contains('button', /create project/i).should('be.visible');
  });
});
