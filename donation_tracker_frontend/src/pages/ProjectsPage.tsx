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
import apiClient, {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../api/client';
import { Project } from '../types';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState<
    'created' | 'updated' | 'deleted' | 'archived' | 'restored' | null
  >(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const params: any = {};
        if (showArchived) {
          params.include_discarded = 'true';
        }
        const response = await apiClient.get('/api/projects', { params });
        setProjects(response.data.projects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    loadProjects();
  }, [showArchived]);

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
      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);
      setFormKey((prev) => prev + 1); // Reset form by changing key

      // Auto-dismiss notification after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to create/update project:', error);
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject(project.id);
      setSuccess('deleted');
      const refreshed = await fetchProjects();
      setProjects(refreshed.projects);

      // Auto-dismiss notification after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/archive`);
      setSuccess('archived');
      setError(null);

      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setError(
          err.response.data.errors?.join(', ') || 'Failed to archive project'
        );
      } else {
        setError('Failed to archive project');
      }
      console.error('Failed to archive project:', err);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/projects/${id}/restore`);
      setSuccess('restored');
      setError(null);

      const params: any = {};
      if (showArchived) {
        params.include_discarded = 'true';
      }
      const response = await apiClient.get('/api/projects', { params });
      setProjects(response.data.projects);

      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to restore project:', error);
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
