import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { API_URL } from '../api';

export default function User() {
  const { user, token, setUser, handleLogout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
          setName(data.user.name || '');
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch {
        setMessage('Unable to refresh profile.');
      }
    };

    fetchProfile();
  }, [token, navigate, setUser]);

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <p>Loading user information...</p>;
  }

  return (
    <section className="page-card">
      <div className="profile-header">
        <div>
          <h1>User Profile</h1>
          <p>Manage your account information.</p>
        </div>
        <button className="btn btn-muted" onClick={handleLogout}>Logout</button>
      </div>

      {message && <p className={message.startsWith('Error') ? 'profile-message-error' : 'profile-message'}>{message}</p>}

      <div className="profile-layout">
        <form className="profile-card" onSubmit={handleSave}>
          <h2>Account</h2>
          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user.email || ''} disabled />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="profile-card profile-facts">
          <h2>Details</h2>
          <div>
            <span>User ID</span>
            <strong>#{user.id}</strong>
          </div>
          <div>
            <span>Member Since</span>
            <strong>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
