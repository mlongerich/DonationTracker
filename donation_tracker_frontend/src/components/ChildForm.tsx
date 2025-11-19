import {
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useState } from 'react';
import { ChildFormData } from '../types';

interface ChildFormProps {
  onSubmit: (data: ChildFormData) => void;
  initialData?: ChildFormData;
}

const ChildForm: React.FC<ChildFormProps> = ({ onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [gender, setGender] = useState(initialData?.gender || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, gender: gender === '' ? null : gender });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          size="small"
        />
        <FormControl fullWidth size="small">
          <InputLabel id="gender-label">Gender (Optional)</InputLabel>
          <Select
            labelId="gender-label"
            value={gender}
            label="Gender (Optional)"
            onChange={(e) => setGender(e.target.value)}
          >
            <MenuItem value="">
              <em>Not specified</em>
            </MenuItem>
            <MenuItem value="boy">Boy</MenuItem>
            <MenuItem value="girl">Girl</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={!name.trim()}
        >
          Submit
        </Button>
      </Stack>
    </form>
  );
};

export default ChildForm;
