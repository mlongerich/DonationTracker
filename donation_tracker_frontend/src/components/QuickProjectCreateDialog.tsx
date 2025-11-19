import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ProjectForm from './ProjectForm';
import { ProjectFormData } from '../types';
import apiClient from '../api/client';

interface QuickProjectCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  preFillTitle?: string;
}

const QuickProjectCreateDialog: React.FC<QuickProjectCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  preFillTitle,
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const response = await apiClient.post('/api/projects', { project: data });
      const newProject = response.data.project;
      onSuccess(newProject);
      onClose();
    } catch (err: any) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        const errorMessage = Array.isArray(validationErrors)
          ? validationErrors.join(', ')
          : err.response.data.error || 'Validation failed';
        setError(errorMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create project');
      }
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Project
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
          <Box sx={{ mt: 1 }}>
            <ProjectForm onSubmit={handleSubmit} initialTitle={preFillTitle} />
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
      >
        <Alert
          onClose={handleCloseError}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickProjectCreateDialog;
