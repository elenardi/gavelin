import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SplashScreen from './SplashScreen';

export default function AuthCallback() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { loginWithGoogleToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/auth?error=google_failed');
      return;
    }

    loginWithGoogleToken(token);
    navigate('/home');
  }, []);

  return <SplashScreen />;
}
