import React, { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ProjectForm from '../components/ProjectForm';
import ProjectList from '../components/ProjectList';
import {
  createProject,
  updateProject,
  deleteProject,
} from '../api/client';
import apiClient from '../api/client';
import { Project } from '../types';
import { useProjects } from '../hooks';

const ProjectsPage: React.FC = () => {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState<
    'created' | 'updated' | 'deleted' | 'archived' | 'restored' | null
  >(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { projects, fetchProjects } = useProjects();

  useEffect(() => {
    fetchProjects({ includeDiscarded: showArchived });
  }, [showArchived, fetchProjects]);

  const handleSubmit = async (data: {
    title: string;
    description?: string;
    project_type: string;
  }) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
        setEditingProject(null);
        setSuccess('updated');
      } else {
        await createProject(data);
        setSuccess('created');
      }
      fetchProjects({ includeDiscarded: showArchived });
      setFormKey((prev) => prev + 1);

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      // Error silently handled
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject(project.id);
      setSuccess('deleted');
      fetchProjects({ includeDiscarded: showArchived });

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      // Error silently handled
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/archive`);
      setSuccess('archived');
      setError(null);

      fetchProjects({ includeDiscarded: showArchived });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(
          err.response.data.errors?.join(', ') || 'Failed to archive project'
        );
      } else {
        setError('Failed to archive project');
      }
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/restore`);
      setSuccess('restored');
      setError(null);

      fetchProjects({ includeDiscarded: showArchived });

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to restore project');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manage Projects
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Project {success} successfully!
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {editingProject ? 'Edit Project' : 'Create Project'}
          </Typography>
          <ProjectForm
            key={formKey}
            onSubmit={handleSubmit}
            project={editingProject || undefined}
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Project List
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
            }
            label="Show Archived Projects"
            sx={{ mb: 2 }}
          />
          <ProjectList
            projects={projects}
            onEdit={setEditingProject}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onRestore={handleRestore}
          />
        </Box>
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default ProjectsPage;
