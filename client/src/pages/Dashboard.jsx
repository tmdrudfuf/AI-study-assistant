import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../api';

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [dashboardView, setDashboardView] = useState('sessions');
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
        const response = await fetch(`${API_URL}/api/study-sessions`, {
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

    if (daysLeft < 0) return 'Overdue';
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

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

  const isComplete = (session) => hasSummary(session) && hasQuiz(session) && hasFlashcards(session);

  const matchesStatusFilter = (session) => {
    if (statusFilter === 'needs-summary') return !hasSummary(session);
    if (statusFilter === 'needs-quiz') return !hasQuiz(session);
    if (statusFilter === 'needs-flashcards') return !hasFlashcards(session);
    if (statusFilter === 'complete') return isComplete(session);
    return true;
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const subjects = [...new Set(sessions.map((session) => session.subject).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  const subjectSummaries = subjects.map((subject) => {
    const subjectSessions = sessions.filter((session) => session.subject === subject);
    return {
      name: subject,
      count: subjectSessions.length,
      completeCount: subjectSessions.filter(isComplete).length,
      needsQuizCount: subjectSessions.filter((session) => !hasQuiz(session)).length,
      latestSession: [...subjectSessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
    };
  });

  const filteredSessions = sessions.filter((session) => {
    const searchableText = `${session.title || ''} ${session.original_text || ''}`.toLowerCase();
    const matchesSubject = subjectFilter === 'all' || session.subject === subjectFilter;
    return searchableText.includes(normalizedSearch) && matchesStatusFilter(session) && matchesSubject;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'due-date') {
      if (!a.due_date && !b.due_date) return new Date(b.created_at) - new Date(a.created_at);
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (sortBy === 'complete-first') return Number(isComplete(b)) - Number(isComplete(a));
    if (sortBy === 'incomplete-first') return Number(isComplete(a)) - Number(isComplete(b));
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const openSubject = (subject) => {
    setSubjectFilter(subject);
    setSearchTerm('');
    setDashboardView('sessions');
  };

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

      <div className="content-tabs dashboard-tabs">
        <button
          className={dashboardView === 'sessions' ? 'tab-button tab-button-active' : 'tab-button'}
          onClick={() => setDashboardView('sessions')}
        >
          Sessions
        </button>
        <button
          className={dashboardView === 'subjects' ? 'tab-button tab-button-active' : 'tab-button'}
          onClick={() => setDashboardView('subjects')}
        >
          Subjects
        </button>
      </div>

      {error && <p className="message message-error">{error}</p>}

      {dashboardView === 'subjects' ? (
        loading ? (
          <p>Loading...</p>
        ) : subjects.length === 0 ? (
          <div className="empty-state">
            <h3>No subjects yet</h3>
            <p>Add a subject when creating or editing a study session.</p>
          </div>
        ) : (
          <div className="subject-grid">
            {subjectSummaries.map((subject) => (
              <button className="subject-card" key={subject.name} onClick={() => openSubject(subject.name)}>
                <div>
                  <span className="subject-badge">{subject.name}</span>
                  <h3>{subject.count} sessions</h3>
                </div>
                <div className="subject-card-stats">
                  <span>{subject.completeCount} complete</span>
                  <span>{subject.needsQuizCount} need quiz</span>
                </div>
                {subject.latestSession && <p>Latest: {subject.latestSession.title}</p>}
              </button>
            ))}
          </div>
        )
      ) : (
        <>
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
            <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option value={subject} key={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="due-date">Due date first</option>
              <option value="oldest">Oldest first</option>
              <option value="complete-first">Complete first</option>
              <option value="incomplete-first">Incomplete first</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          {!loading && sessions.length > 0 && (
            <p className="filter-count">
              Showing {sortedSessions.length} of {sessions.length}
              {subjectFilter !== 'all' ? ` in ${subjectFilter}` : ''}
            </p>
          )}

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
                    <div className="session-tag-row">
                      {session.subject && <span className="subject-badge">{session.subject}</span>}
                      {session.due_date && (
                        <span className="due-date-badge">
                          Due {formatDueDate(session.due_date)} · {getDueDateStatus(session.due_date)}
                        </span>
                      )}
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
                      Summary {hasSummary(session) ? 'Yes' : '-'}
                    </span>
                    <span className={hasQuiz(session) ? 'status-badge status-complete' : 'status-badge'}>
                      Quiz {hasQuiz(session) ? 'Yes' : '-'}
                    </span>
                    <span className={hasFlashcards(session) ? 'status-badge status-complete' : 'status-badge'}>
                      Flashcards {hasFlashcards(session) ? 'Yes' : '-'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
