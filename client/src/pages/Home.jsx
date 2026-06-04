import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

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
        const response = await fetch('http://localhost:4000/api/study-sessions', {
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

  const completeCount = sessions.filter((session) => hasSummary(session) && hasQuiz(session) && hasFlashcards(session)).length;
  const needsQuizCount = sessions.filter((session) => !hasQuiz(session)).length;
  const needsFlashcardsCount = sessions.filter((session) => !hasFlashcards(session)).length;
  const recentSessions = sessions.slice(0, 3);

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
          <p>Pick up where you left off or start a new study session.</p>
          <div className="home-actions">
            <Link to="/study-session">
              <button className="btn btn-primary">New Study Session</button>
            </Link>
            <Link to="/dashboard">
              <button className="btn btn-muted">Dashboard</button>
            </Link>
          </div>
        </div>
      </div>

      <div className="snapshot-grid">
        <div className="snapshot-card">
          <span>Total Sessions</span>
          <strong>{sessions.length}</strong>
        </div>
        <div className="snapshot-card">
          <span>Complete</span>
          <strong>{completeCount}</strong>
        </div>
        <div className="snapshot-card">
          <span>Need Quiz</span>
          <strong>{needsQuizCount}</strong>
        </div>
        <div className="snapshot-card">
          <span>Need Flashcards</span>
          <strong>{needsFlashcardsCount}</strong>
        </div>
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
                <div className="status-badges">
                  <span className={hasSummary(session) ? 'status-badge status-complete' : 'status-badge'}>
                    Summary {hasSummary(session) ? '✓' : '-'}
                  </span>
                  <span className={hasQuiz(session) ? 'status-badge status-complete' : 'status-badge'}>
                    Quiz {hasQuiz(session) ? '✓' : '-'}
                  </span>
                  <span className={hasFlashcards(session) ? 'status-badge status-complete' : 'status-badge'}>
                    Flashcards {hasFlashcards(session) ? '✓' : '-'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
