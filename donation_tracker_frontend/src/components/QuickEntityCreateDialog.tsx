import { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import StandardDialog from './StandardDialog';
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
  const [error, setError] = useState<string | null>(null);
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
        setError(errorMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create child');
      }
    }
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
        setError(errorMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create project');
      }
    }
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: 'child' | 'project'
  ) => {
    // Clear error when switching tabs
    setError(null);
    setCurrentTab(newValue);
  };

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setDialogKey((prev) => prev + 1);
      setCurrentTab('child');
      setError(null);
    }
  }, [open]);

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="Create New Entity"
      error={error}
      onErrorClose={() => setError(null)}
    >
      <Box sx={{ mt: -1 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Create Child" value="child" />
          <Tab label="Create Project" value="project" />
        </Tabs>
      </Box>
      <Box key={dialogKey} sx={{ mt: 2 }}>
        <Box sx={{ display: currentTab === 'child' ? 'block' : 'none' }}>
          <ChildForm
            onSubmit={handleChildSubmit}
            initialData={
              preFillText ? { name: preFillText, gender: null } : undefined
            }
          />
        </Box>
        <Box sx={{ display: currentTab === 'project' ? 'block' : 'none' }}>
          <ProjectForm
            onSubmit={handleProjectSubmit}
            initialTitle={preFillText}
          />
        </Box>
      </Box>
    </StandardDialog>
  );
};

export default QuickEntityCreateDialog;
