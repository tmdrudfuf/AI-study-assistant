import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function User() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  if (!user) {
    return <p>Loading user information...</p>;
  }

  return (
    <section className="page-card">
      <h1>👤 User Profile</h1>
      <div style={{ gap: '16px', display: 'grid' }}>
        <div>
          <strong>Name:</strong> {user.name}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
        <div>
          <strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}
        </div>
      </div>
    </section>
  );
}
