import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from './Navigation';

describe('Navigation', () => {
  it('renders Donations link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(
      screen.getByRole('link', { name: /donations/i })
    ).toBeInTheDocument();
  });

  it('renders Donors link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /donors/i })).toBeInTheDocument();
  });

  it('renders Projects link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
  });

  it('renders Children link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /children/i })).toBeInTheDocument();
  });

  it('renders Sponsorships link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(
      screen.getByRole('link', { name: /sponsorships/i })
    ).toBeInTheDocument();
  });

  it('uses Material-UI AppBar component', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    // AppBar renders as a <header> element with specific MUI classes
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('MuiAppBar-root');
  });

  it('renders Admin link', () => {
    render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
  });
});
