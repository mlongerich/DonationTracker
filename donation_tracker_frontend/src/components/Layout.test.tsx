import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

describe('Layout', () => {
  it('renders Navigation component', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    // Navigation should render the app title
    expect(screen.getByText('Donation Tracker')).toBeInTheDocument();
  });

  it('renders children via Outlet', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Test Child Page</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    // Child route content should render
    expect(screen.getByText('Test Child Page')).toBeInTheDocument();
  });

  it('wraps content in Material-UI Container with maxWidth sm', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Test Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    // Container should exist with proper MUI classes
    const muiContainer = screen.getByTestId('layout-container');
    expect(muiContainer).toBeInTheDocument();
    expect(muiContainer).toHaveClass('MuiContainer-maxWidthSm');
  });
});
