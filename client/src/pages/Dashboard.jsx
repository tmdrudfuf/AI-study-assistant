import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:4000/api/study-sessions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || '세션을 불러올 수 없습니다.');
        }

        setSessions(data || []);
      } catch (err) {
        setError(`❌ 오류: ${err.message}`);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [token, navigate]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <section className="page-card">
      <h1>📚 My Study Sessions</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <Link to="/study-session">
          <button style={{ padding: '10px 20px', fontSize: '16px' }}>
            ➕ New Study Session
          </button>
        </Link>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>로딩 중...</p>
      ) : sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          작성한 세션이 없습니다. 새 세션을 만들어보세요! 🎓
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {sessions.map((session) => (
            <Link to={`/study-session/${session.id}`} key={session.id} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#2563eb' }}>
                      {session.title}
                    </h3>
                    <p style={{
                      margin: '0 0 10px 0',
                      color: '#666',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {session.original_text.substring(0, 100)}...
                    </p>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#999' }}>
                      <span>📅 {formatDate(session.created_at)}</span>
                      <span>🆔 #{session.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
