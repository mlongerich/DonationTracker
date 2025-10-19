import React from 'react';
import Button from '@mui/material/Button';
import { Project } from '../types';

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onEdit, onDelete }) => {
  if (projects.length === 0) {
    return <div>No projects yet.</div>;
  }

  return (
    <div>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.title}
            {!project.system && (
              <>
                <Button size="small" onClick={() => onEdit?.(project)}>
                  Edit
                </Button>
                <Button size="small" onClick={() => onDelete?.(project)}>
                  Delete
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
