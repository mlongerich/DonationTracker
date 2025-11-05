import { useState } from 'react';
import { Button, Box } from '@mui/material';

const ErrorTrigger = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Manually triggered error for testing ErrorBoundary');
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="outlined"
        color="error"
        onClick={() => setShouldThrow(true)}
      >
        Trigger Error (Test ErrorBoundary)
      </Button>
    </Box>
  );
};

export default ErrorTrigger;
