import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Project, ProjectFormData } from '../types';

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  project?: Project;
  initialTitle?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  onSubmit,
  project,
  initialTitle,
}) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('general');

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description || '');
      setProjectType(project.project_type);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      project_type: projectType,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          required
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
        />
        <TextField
          select
          label="Project Type"
          fullWidth
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          size="small"
        >
          <MenuItem value="general">General</MenuItem>
          <MenuItem value="campaign">Campaign</MenuItem>
          <MenuItem value="sponsorship">Sponsorship</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disabled={!title.trim()}>
          {project ? 'Update Project' : 'Create Project'}
        </Button>
      </Stack>
    </form>
  );
};

export default ProjectForm;
