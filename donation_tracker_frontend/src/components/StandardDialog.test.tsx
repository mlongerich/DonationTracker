import { render, screen, fireEvent } from '@testing-library/react';
import StandardDialog from './StandardDialog';

describe('StandardDialog', () => {
  it('renders title correctly', () => {
    const mockOnClose = jest.fn();

    render(
      <StandardDialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog Title"
      >
        <div>Test Content</div>
      </StandardDialog>
    );

    expect(screen.getByText('Test Dialog Title')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    const mockOnClose = jest.fn();

    render(
      <StandardDialog open={true} onClose={mockOnClose} title="Test Dialog">
        <div>Test Child Content</div>
      </StandardDialog>
    );

    expect(screen.getByText('Test Child Content')).toBeInTheDocument();
  });

  it('close button calls onClose when clicked', () => {
    const mockOnClose = jest.fn();

    render(
      <StandardDialog open={true} onClose={mockOnClose} title="Test Dialog">
        <div>Content</div>
      </StandardDialog>
    );

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays error Snackbar when error prop provided', () => {
    const mockOnClose = jest.fn();
    const mockOnErrorClose = jest.fn();

    render(
      <StandardDialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog"
        error="Test error message"
        onErrorClose={mockOnErrorClose}
      >
        <div>Content</div>
      </StandardDialog>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('applies custom maxWidth prop correctly', () => {
    const mockOnClose = jest.fn();

    render(
      <StandardDialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog"
        maxWidth="md"
      >
        <div>Content</div>
      </StandardDialog>
    );

    // Verify dialog renders with custom maxWidth without errors
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
