import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChildForm from './ChildForm';
import ProjectForm from './ProjectForm';
import { ChildFormData, ProjectFormData } from '../types';
import apiClient from '../api/client';

interface QuickEntityCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
  onChildCreated: (child: any) => void;
  preFillText?: string;
}

const QuickEntityCreateDialog: React.FC<QuickEntityCreateDialogProps> = ({
  open,
  onClose,
  onProjectCreated,
  onChildCreated,
  preFillText,
}) => {
  const [currentTab, setCurrentTab] = useState<'child' | 'project'>('child');
  const [childError, setChildError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const handleChildSubmit = async (data: ChildFormData) => {
    try {
      console.log('QuickEntityCreateDialog: Submitting child', data);
      const response = await apiClient.post('/api/children', { child: data });
      console.log(
        'QuickEntityCreateDialog: Child success response',
        response.data
      );
      const newChild = response.data.child;
      onChildCreated(newChild);
      onClose();
    } catch (err: any) {
      console.error('QuickEntityCreateDialog: Error creating child', err);
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        const errorMessage = Array.isArray(validationErrors)
          ? validationErrors.join(', ')
          : err.response.data.error || 'Validation failed';
        setChildError(errorMessage);
      } else {
        setChildError(err.response?.data?.error || 'Failed to create child');
      }
    }
  };

  const handleCloseChildError = () => {
    setChildError(null);
  };

  const handleProjectSubmit = async (data: ProjectFormData) => {
    try {
      console.log('QuickEntityCreateDialog: Submitting project', data);
      const response = await apiClient.post('/api/projects', { project: data });
      console.log(
        'QuickEntityCreateDialog: Project success response',
        response.data
      );
      const newProject = response.data.project;
      onProjectCreated(newProject);
      onClose();
    } catch (err: any) {
      console.error('QuickEntityCreateDialog: Error creating project', err);
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        const errorMessage = Array.isArray(validationErrors)
          ? validationErrors.join(', ')
          : err.response.data.error || 'Validation failed';
        setProjectError(errorMessage);
      } else {
        setProjectError(
          err.response?.data?.error || 'Failed to create project'
        );
      }
    }
  };

  const handleCloseProjectError = () => {
    setProjectError(null);
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: 'child' | 'project'
  ) => {
    // Clear errors when switching tabs
    setChildError(null);
    setProjectError(null);
    setCurrentTab(newValue);
  };

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setDialogKey((prev) => prev + 1);
      setCurrentTab('child');
      setChildError(null);
      setProjectError(null);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Entity
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
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Create Child" value="child" />
          <Tab label="Create Project" value="project" />
        </Tabs>
        <DialogContent sx={{ pt: 3 }} key={dialogKey}>
          <Box
            sx={{ display: currentTab === 'child' ? 'block' : 'none', mt: 1 }}
          >
            <ChildForm
              onSubmit={handleChildSubmit}
              initialData={
                preFillText ? { name: preFillText, gender: null } : undefined
              }
            />
          </Box>
          <Box
            sx={{ display: currentTab === 'project' ? 'block' : 'none', mt: 1 }}
          >
            <ProjectForm
              onSubmit={handleProjectSubmit}
              initialTitle={preFillText}
            />
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!childError}
        autoHideDuration={6000}
        onClose={handleCloseChildError}
      >
        <Alert
          onClose={handleCloseChildError}
          severity="error"
          sx={{ width: '100%' }}
        >
          {childError}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!projectError}
        autoHideDuration={6000}
        onClose={handleCloseProjectError}
      >
        <Alert
          onClose={handleCloseProjectError}
          severity="error"
          sx={{ width: '100%' }}
        >
          {projectError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default QuickEntityCreateDialog;
