describe('Project Management', () => {
  beforeEach(() => {
    // Visit Admin page and click Projects tab
    cy.visit('/admin');
    cy.contains('button', 'Projects').click();
  });

  it('displays the Projects section with form and list', () => {
    // Verify Projects section is visible (no "Manage Projects" h1 - it's now a section in Admin)
    cy.contains('h2', 'Create Project').should('be.visible');
    cy.contains('h2', 'Project List').should('be.visible');

    // Verify project form is visible
    cy.contains('label', /title/i).should('be.visible');
    cy.contains('label', /description/i).should('be.visible');
    cy.contains('label', /project type/i).should('be.visible');
    cy.contains('button', /create project/i).should('be.visible');
  });
});
