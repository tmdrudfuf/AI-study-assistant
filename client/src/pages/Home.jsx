import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../api';

export default function Home() {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/study-sessions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setSessions(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [token]);

  const hasSummary = (session) => Boolean(session.summary_ko || session.summary_en || session.summary);
  const hasQuiz = (session) =>
    Boolean(
      session.quiz_json?.questions?.length ||
        session.quiz_json?.ko?.questions?.length ||
        session.quiz_json?.en?.questions?.length
    );
  const hasFlashcards = (session) => {
    const koreanCards = session.flashcards_json?.ko?.cards || [];
    const englishCards = session.flashcards_json?.en?.cards || [];
    return koreanCards.length > 0 || englishCards.length > 0;
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(`${dateString.slice(0, 10)}T00:00:00`).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getDueDateStatus = (dateString) => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(`${dateString.slice(0, 10)}T00:00:00`);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

  const recentSessions = sessions.slice(0, 3);
  const dueSoonSessions = sessions
    .filter((session) => session.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3);
  const primaryDueSession = dueSoonSessions[0];
  const secondaryDueSessions = dueSoonSessions.slice(1);

  if (!token) {
    return (
      <section className="home-page">
        <div className="home-hero home-hero-simple">
          <div>
            <h1>Study from your notes faster</h1>
            <p>Create study sessions from your notes, then generate summaries, quizzes, and flashcards.</p>
            <div className="home-actions">
              <Link to="/signup">
                <button className="btn btn-primary">Create Account</button>
              </Link>
              <Link to="/login">
                <button className="btn btn-muted">Login</button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-page">
      <div className="home-hero home-hero-simple">
        <div>
          <h1>Welcome back, {user?.name || 'student'}</h1>
          <p>Your next study priority is ready.</p>
        </div>
      </div>

      <div className="home-section">
        <div className="section-heading">
          <h2>Study Next</h2>
          <Link to="/dashboard">View dashboard</Link>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : dueSoonSessions.length === 0 ? (
          <div className="empty-state">
            <h3>No deadlines yet</h3>
            <p>Add a due date to a study session to see what to study first.</p>
            <Link to="/study-session">Create study session</Link>
          </div>
        ) : (
          <div className="study-next-layout">
            <Link to={`/study-session/${primaryDueSession.id}`} className="study-next-primary">
              <span className="study-next-label">Next</span>
              <h3>{primaryDueSession.title}</h3>
              <div className="session-tag-row">
                {primaryDueSession.subject && <span className="subject-badge">{primaryDueSession.subject}</span>}
                <span className="due-date-badge">
                  Due {formatDueDate(primaryDueSession.due_date)} · {getDueDateStatus(primaryDueSession.due_date)}
                </span>
              </div>
            </Link>

            {secondaryDueSessions.length > 0 && (
              <div className="study-next-secondary">
                {secondaryDueSessions.map((session) => (
                  <Link to={`/study-session/${session.id}`} className="study-next-row" key={session.id}>
                    <span>{session.title}</span>
                    <strong>{getDueDateStatus(session.due_date)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="home-section">
        <div className="section-heading">
          <h2>Recent Sessions</h2>
          <Link to="/dashboard">View all</Link>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : recentSessions.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions yet</h3>
            <p>Create your first study session to start generating study tools.</p>
          </div>
        ) : (
          <div className="recent-session-list">
            {recentSessions.map((session) => (
              <Link to={`/study-session/${session.id}`} className="recent-session-card" key={session.id}>
                <h3>{session.title}</h3>
                <div className="session-tag-row">
                  {session.subject && <span className="subject-badge">{session.subject}</span>}
                  {session.due_date && <span className="due-date-badge">Due {formatDueDate(session.due_date)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
