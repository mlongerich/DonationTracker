import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const CallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      const user = JSON.parse(decodeURIComponent(userParam));
      login(token, user);
      navigate('/');
      hasProcessed.current = true;
    } else {
      navigate('/login');
      hasProcessed.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default CallbackPage;
