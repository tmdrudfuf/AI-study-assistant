import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../api';

export default function GoogleAuthButton({ onError, onSuccess }) {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return null;
  }

  const handleGoogleSuccess = async (googleResponse) => {
    onError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: googleResponse.credential }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google sign-in failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      onSuccess('Google sign-in successful.');
      navigate('/dashboard');
    } catch (error) {
      onError(error.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="google-auth-button">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => onError('Google sign-in was cancelled or failed.')}
        shape="rectangular"
        size="large"
        text="continue_with"
        width="320"
      />
    </div>
  );
}
