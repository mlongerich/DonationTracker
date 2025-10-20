import React, { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ProjectForm from '../components/ProjectForm';
import ProjectList from '../components/ProjectList';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/client';
import { Project } from '../types';

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState<'created' | 'updated' | 'deleted' | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data.projects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    loadProjects();
  }, []);

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
      const refreshed = await fetchProjects();
      setProjects(refreshed.projects);
      setFormKey(prev => prev + 1); // Reset form by changing key

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
          <ProjectList
            projects={projects}
            onEdit={setEditingProject}
            onDelete={handleDelete}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default ProjectsPage;
