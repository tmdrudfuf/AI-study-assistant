import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store token and user information.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      setMessage('Login successful. Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError('Unable to connect to the server.');
    }
  };

  return (
    <section className="page-card">
      <h1>Login</h1>
      <form className="form-group" onSubmit={handleSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        <button type="submit">Login</button>
      </form>
      {error && <p className="message message-error">{error}</p>}
      {message && <p className="message message-success">{message}</p>}
    </section>
  );
}
