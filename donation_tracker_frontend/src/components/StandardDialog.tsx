import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface StandardDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  error?: string | null;
  onErrorClose?: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  children,
  error = null,
  onErrorClose,
  maxWidth = 'sm',
}) => (
  <>
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mt: 1 }}>{children}</Box>
      </DialogContent>
    </Dialog>
    {error && (
      <Snackbar open={!!error} autoHideDuration={6000} onClose={onErrorClose}>
        <Alert onClose={onErrorClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    )}
  </>
);

export default StandardDialog;
