import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
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
          throw new Error(data.message || 'Unable to load study sessions.');
        }

        setSessions(data || []);
      } catch (err) {
        setError(`Error: ${err.message}`);
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

  const hasSummary = (session) => Boolean(session.summary_ko || session.summary_en || session.summary);

  const hasQuiz = (session) => Boolean(session.quiz_json?.questions?.length);

  const hasFlashcards = (session) => {
    const koreanCards = session.flashcards_json?.ko?.cards || [];
    const englishCards = session.flashcards_json?.en?.cards || [];
    return koreanCards.length > 0 || englishCards.length > 0;
  };

  const isComplete = (session) => hasSummary(session) && hasQuiz(session) && hasFlashcards(session);

  const matchesStatusFilter = (session) => {
    if (statusFilter === 'needs-summary') return !hasSummary(session);
    if (statusFilter === 'needs-quiz') return !hasQuiz(session);
    if (statusFilter === 'needs-flashcards') return !hasFlashcards(session);
    if (statusFilter === 'complete') return isComplete(session);
    return true;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredSessions = sessions.filter((session) => {
    const searchableText = `${session.title || ''} ${session.original_text || ''}`.toLowerCase();
    return searchableText.includes(normalizedSearch) && matchesStatusFilter(session);
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'complete-first') return Number(isComplete(b)) - Number(isComplete(a));
    if (sortBy === 'incomplete-first') return Number(isComplete(a)) - Number(isComplete(b));
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <section className="page-card">
      <div className="dashboard-header">
        <div>
          <h1>My Study Sessions</h1>
          <p>{sessions.length} saved sessions</p>
        </div>
        <Link to="/study-session">
          <button className="btn btn-primary">New Study Session</button>
        </Link>
      </div>

      <div className="dashboard-filters">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by title or text"
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All sessions</option>
          <option value="needs-summary">Needs summary</option>
          <option value="needs-quiz">Needs quiz</option>
          <option value="needs-flashcards">Needs flashcards</option>
          <option value="complete">Complete</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="complete-first">Complete first</option>
          <option value="incomplete-first">Incomplete first</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {!loading && sessions.length > 0 && (
        <p className="filter-count">
          Showing {sortedSessions.length} of {sessions.length}
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <h3>No study sessions yet</h3>
          <p>Create your first session to generate summaries, quizzes, and flashcards.</p>
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="empty-state">
          <h3>No matching sessions</h3>
          <p>Try a different search term or filter.</p>
        </div>
      ) : (
        <div className="session-list">
          {sortedSessions.map((session) => (
            <Link to={`/study-session/${session.id}`} key={session.id} className="session-card">
              <div>
                <div className="session-card-top">
                  <h3>{session.title}</h3>
                  <span>#{session.id}</span>
                </div>
                <p className="session-preview">
                  {(session.original_text || '').substring(0, 140)}
                  {session.original_text?.length > 140 ? '...' : ''}
                </p>
                <div className="session-meta">
                  <span>{formatDate(session.created_at)}</span>
                </div>
              </div>

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
    </section>
  );
}
