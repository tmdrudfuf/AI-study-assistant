import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../api';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editingSummaryLanguage, setEditingSummaryLanguage] = useState(null);
  const [editSummaryText, setEditSummaryText] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizLanguage, setQuizLanguage] = useState('ko');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [flippedFlashcards, setFlippedFlashcards] = useState({});
  const [activeTab, setActiveTab] = useState('text');
  const [flashcardMode, setFlashcardMode] = useState('study');
  const [flashcardLanguage, setFlashcardLanguage] = useState('ko');
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [studyCardFlipped, setStudyCardFlipped] = useState(false);
  const [newFlashcards, setNewFlashcards] = useState({
    ko: { front: '', back: '' },
    en: { front: '', back: '' },
  });
  const [editingFlashcard, setEditingFlashcard] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/study-sessions/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load this session.');
        }

        setSession(data);
        setEditTitle(data.title);
        setEditText(data.original_text);
      } catch (err) {
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, token, navigate]);

  const handleSaveChanges = async () => {
    if (!editTitle.trim() || !editText.trim()) {
      setError('Please enter both a title and original text.');
      return;
    }

    setSavingChanges(true);
    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          original_text: editText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update this session.');
      }

      setSession(data);
      setIsEditing(false);
      setError('');
      // Show success feedback.
      alert('Session updated.');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSavingChanges(false);
    }
  };

  const startEditingSummary = (language, value) => {
    setEditingSummaryLanguage(language);
    setEditSummaryText(value || '');
  };

  const cancelEditingSummary = () => {
    setEditingSummaryLanguage(null);
    setEditSummaryText('');
  };

  const handleSaveSummary = async () => {
    if (!editingSummaryLanguage || !editSummaryText.trim()) return;

    setSavingChanges(true);
    try {
      const payload =
        editingSummaryLanguage === 'en'
          ? { summary_en: editSummaryText }
          : { summary_ko: editSummaryText, summary: editSummaryText };

      const response = await fetch(`${API_URL}/api/study-sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update summary.');
      }

      setSession(data);
      cancelEditingSummary();
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleGenerateSummary = async (language) => {
    setGeneratingSummary(true);
    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to generate summary.');
      }

      setSession(data.session);
      setActiveTab('summary');
      setError('');
      alert('Summary generated.');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateQuiz = async (language) => {
    setGeneratingQuiz(true);
    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to generate quiz.');
      }

      setSession(data.session);
      setSelectedAnswers({});
      setActiveTab('quiz');
      setQuizLanguage(language);
      setCurrentQuizIndex(0);
      setError('');
      alert('Quiz generated.');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async (language) => {
    setGeneratingFlashcards(true);
    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to generate flashcards.');
      }

      setSession(data.session);
      setFlippedFlashcards({});
      setActiveTab('flashcards');
      setFlashcardLanguage(language);
      setFlashcardMode('study');
      setCurrentFlashcardIndex(0);
      setStudyCardFlipped(false);
      setError('');
      alert('Flashcards generated.');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleManualFlashcardChange = (language, field, value) => {
    setNewFlashcards((cards) => ({
      ...cards,
      [language]: {
        ...cards[language],
        [field]: value,
      },
    }));
  };

  const handleAddFlashcard = async (language) => {
    const card = newFlashcards[language];

    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}/flashcards/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language, front: card.front, back: card.back }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to add flashcard.');
      }

      setSession(data.session);
      setFlashcardLanguage(language);
      setFlashcardMode('edit');
      setNewFlashcards((cards) => ({
        ...cards,
        [language]: { front: '', back: '' },
      }));
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleSaveFlashcard = async () => {
    if (!editingFlashcard) return;

    try {
      const response = await fetch(
        `${API_URL}/api/study-sessions/${id}/flashcards/${editingFlashcard.language}/${editingFlashcard.index}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            front: editingFlashcard.front,
            back: editingFlashcard.back,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to update flashcard.');
      }

      setSession(data.session);
      setEditingFlashcard(null);
      setFlashcardMode('edit');
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleDeleteFlashcard = async (language, index) => {
    if (!window.confirm('Delete this flashcard?')) return;

    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}/flashcards/${language}/${index}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to delete flashcard.');
      }

      setSession(data.session);
      setEditingFlashcard(null);
      setFlippedFlashcards({});
      setCurrentFlashcardIndex(0);
      setStudyCardFlipped(false);
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('Delete this session?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete this session.');
      }

      alert('Session deleted.');
      navigate('/dashboard');
    } catch (err) {
      setError(`Error: ${err.message}`);
    }
  };

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

  const legacyQuizQuestions = session?.quiz_json?.questions || [];
  const quizQuestionsKo = session?.quiz_json?.ko?.questions || legacyQuizQuestions;
  const quizQuestionsEn = session?.quiz_json?.en?.questions || [];
  const quizQuestions = quizLanguage === 'en' ? quizQuestionsEn : quizQuestionsKo;
  const safeQuizIndex = quizQuestions.length ? Math.min(currentQuizIndex, quizQuestions.length - 1) : 0;
  const currentQuizQuestion = quizQuestions[safeQuizIndex];
  const answeredCount = quizQuestions.filter((_, index) => selectedAnswers[index] !== undefined).length;
  const correctCount = quizQuestions.filter(
    (item, index) => selectedAnswers[index] !== undefined && selectedAnswers[index] === item.answerIndex
  ).length;
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = quizQuestions.length - answeredCount;
  const flashcardsKo = session?.flashcards_json?.ko?.cards || [];
  const flashcardsEn = session?.flashcards_json?.en?.cards || [];
  const activeFlashcards = flashcardLanguage === 'en' ? flashcardsEn : flashcardsKo;
  const safeFlashcardIndex = activeFlashcards.length
    ? Math.min(currentFlashcardIndex, activeFlashcards.length - 1)
    : 0;
  const currentFlashcard = activeFlashcards[safeFlashcardIndex];

  const toggleFlashcard = (language, index) => {
    const cardKey = `${language}-${index}`;
    setFlippedFlashcards((cards) => ({
      ...cards,
      [cardKey]: !cards[cardKey],
    }));
  };

  const handleFlashcardLanguageChange = (language) => {
    setFlashcardLanguage(language);
    setCurrentFlashcardIndex(0);
    setStudyCardFlipped(false);
  };

  const showPreviousFlashcard = () => {
    if (!activeFlashcards.length) return;
    setCurrentFlashcardIndex((index) => (index === 0 ? activeFlashcards.length - 1 : index - 1));
    setStudyCardFlipped(false);
  };

  const showNextFlashcard = () => {
    if (!activeFlashcards.length) return;
    setCurrentFlashcardIndex((index) => (index + 1) % activeFlashcards.length);
    setStudyCardFlipped(false);
  };

  const handleQuizLanguageChange = (language) => {
    setQuizLanguage(language);
    setSelectedAnswers({});
    setCurrentQuizIndex(0);
  };

  const showPreviousQuizQuestion = () => {
    if (!quizQuestions.length) return;
    setCurrentQuizIndex((index) => (index === 0 ? quizQuestions.length - 1 : index - 1));
  };

  const showNextQuizQuestion = () => {
    if (!quizQuestions.length) return;
    setCurrentQuizIndex((index) => (index + 1) % quizQuestions.length);
  };

  const renderFlashcardSection = (language, title, cards) => (
    <div className="flashcard-section">
      <div className="flashcard-section-header">
        <h4>{title}</h4>
        <span>{cards.length} cards</span>
      </div>

      <div className="manual-card-form">
        <input
          value={newFlashcards[language].front}
          onChange={(event) => handleManualFlashcardChange(language, 'front', event.target.value)}
          placeholder="Front"
        />
        <input
          value={newFlashcards[language].back}
          onChange={(event) => handleManualFlashcardChange(language, 'back', event.target.value)}
          placeholder="Back"
        />
        <button
          className="btn btn-amber"
          onClick={() => handleAddFlashcard(language)}
          disabled={!newFlashcards[language].front.trim() || !newFlashcards[language].back.trim()}
        >
          Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="subtle-text">No cards yet. Add one manually or generate cards with AI.</p>
      ) : (
        <div className="flashcard-grid">
          {cards.map((card, index) => {
            const cardKey = `${language}-${index}`;
            const isFlipped = Boolean(flippedFlashcards[cardKey]);
            const isEditing =
              editingFlashcard?.language === language && editingFlashcard?.index === index;

            return (
              <div className="flashcard-shell" key={cardKey}>
                {isEditing ? (
                  <div className="flashcard-edit-form">
                    <label>Front</label>
                    <textarea
                      value={editingFlashcard.front}
                      onChange={(event) =>
                        setEditingFlashcard((current) => ({
                          ...current,
                          front: event.target.value,
                        }))
                      }
                      rows="3"
                    />
                    <label>Back</label>
                    <textarea
                      value={editingFlashcard.back}
                      onChange={(event) =>
                        setEditingFlashcard((current) => ({
                          ...current,
                          back: event.target.value,
                        }))
                      }
                      rows="4"
                    />
                    <div className="action-row">
                      <button
                        className="btn btn-green"
                        onClick={handleSaveFlashcard}
                        disabled={!editingFlashcard.front.trim() || !editingFlashcard.back.trim()}
                      >
                        Save
                      </button>
                      <button className="btn btn-muted" onClick={() => setEditingFlashcard(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFlashcard(language, index)}
                      className="flashcard-button"
                    >
                      <strong>{isFlipped ? 'Back' : 'Front'}</strong>
                      <p>{isFlipped ? card.back : card.front}</p>
                    </button>
                    <div className="flashcard-actions">
                      <button
                        className="mini-button"
                        onClick={() =>
                          setEditingFlashcard({
                            language,
                            index,
                            front: card.front || '',
                            back: card.back || '',
                          })
                        }
                      >
                        Edit
                      </button>
                      <button className="mini-button mini-button-danger" onClick={() => handleDeleteFlashcard(language, index)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading) return <section className="page-card"><p>Loading...</p></section>;

  if (!session) return <section className="page-card"><p>Session not found.</p></section>;

  return (
    <section className="page-card">
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px' }}>
        Back to Dashboard
      </button>

      {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

      <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  padding: '8px',
                  border: '2px solid #2563eb',
                  borderRadius: '4px',
                  width: '100%',
                }}
              />
            ) : (
              <h1 style={{ margin: '0 0 10px 0' }}>{session.title}</h1>
            )}
            <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
              📅 {formatDate(session.created_at)} | 🆔 #{session.id}
            </p>
          </div>
        </div>
      </div>

      <div className="session-actions">
        {!isEditing ? (
          <>
            <div className="action-panel">
              <h3>Session</h3>
              <div className="action-row">
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={handleDeleteSession}>
                  Delete
                </button>
              </div>
            </div>

            <div className="action-panel action-panel-wide">
              <h3>AI Tools</h3>
              <div className="tool-grid">
                <div className="tool-group">
                  <h4>Summary</h4>
                  <div className="action-row">
                    <button
                      className="btn btn-green"
                      onClick={() => handleGenerateSummary('ko')}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-teal"
                      onClick={() => handleGenerateSummary('en')}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? 'Generating...' : 'English'}
                    </button>
                  </div>
                </div>

                <div className="tool-group">
                  <h4>Quiz</h4>
                  <div className="action-row">
                    <button
                      className="btn btn-purple"
                      onClick={() => handleGenerateQuiz('ko')}
                      disabled={generatingQuiz}
                    >
                      {generatingQuiz ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-violet"
                      onClick={() => handleGenerateQuiz('en')}
                      disabled={generatingQuiz}
                    >
                      {generatingQuiz ? 'Generating...' : 'English'}
                    </button>
                  </div>
                </div>

                <div className="tool-group">
                  <h4>Flashcards</h4>
                  <div className="action-row">
                    <button
                      className="btn btn-amber"
                      onClick={() => handleGenerateFlashcards('ko')}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-orange"
                      onClick={() => handleGenerateFlashcards('en')}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? 'Generating...' : 'English'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="action-panel">
            <h3>Edit Session</h3>
            <div className="action-row">
              <button className="btn btn-green" onClick={handleSaveChanges} disabled={savingChanges}>
                {savingChanges ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-muted"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(session.title);
                  setEditText(session.original_text);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="content-tabs">
        <button className={activeTab === 'text' ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => setActiveTab('text')}>
          Original Text
        </button>
        <button className={activeTab === 'summary' ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => setActiveTab('summary')}>
          Summary
        </button>
        <button className={activeTab === 'quiz' ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => setActiveTab('quiz')}>
          Quiz
        </button>
        <button className={activeTab === 'flashcards' ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => setActiveTab('flashcards')}>
          Flashcards
        </button>
      </div>

      {activeTab === 'text' && (
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>Original Text</h3>
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows="10"
            style={{
              width: '100%',
              padding: '10px',
              border: '2px solid #2563eb',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          />
        ) : (
          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {session.original_text}
          </div>
        )}
      </div>
      )}

      {activeTab === 'summary' && (
      <div style={{ marginBottom: '30px' }}>
        {(session.summary_ko || session.summary_en || session.summary) ? (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>Summary</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {(session.summary_ko || (!session.summary_en && session.summary)) && (
              <div
                className="summary-panel"
                style={{
                  backgroundColor: '#f0f9ff',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #7dd3fc',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <div className="summary-panel-header">
                  <h4>Korean Summary</h4>
                  <button
                    className="mini-button"
                    onClick={() => startEditingSummary('ko', session.summary_ko || session.summary)}
                  >
                    Edit
                  </button>
                </div>
                {editingSummaryLanguage === 'ko' ? (
                  <div className="summary-edit-form">
                    <textarea
                      value={editSummaryText}
                      onChange={(event) => setEditSummaryText(event.target.value)}
                      rows="10"
                    />
                    <div className="action-row">
                      <button className="btn btn-green" onClick={handleSaveSummary} disabled={savingChanges || !editSummaryText.trim()}>
                        {savingChanges ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-muted" onClick={cancelEditingSummary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  session.summary_ko || session.summary
                )}
              </div>
            )}
            {session.summary_en && (
              <div
                className="summary-panel"
                style={{
                  backgroundColor: '#f0fdf4',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #86efac',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <div className="summary-panel-header">
                  <h4>English Summary</h4>
                  <button className="mini-button" onClick={() => startEditingSummary('en', session.summary_en)}>
                    Edit
                  </button>
                </div>
                {editingSummaryLanguage === 'en' ? (
                  <div className="summary-edit-form">
                    <textarea
                      value={editSummaryText}
                      onChange={(event) => setEditSummaryText(event.target.value)}
                      rows="10"
                    />
                    <div className="action-row">
                      <button className="btn btn-green" onClick={handleSaveSummary} disabled={savingChanges || !editSummaryText.trim()}>
                        {savingChanges ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-muted" onClick={cancelEditingSummary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  session.summary_en
                )}
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="empty-state">
            <h3>Summary</h3>
            <p>No summary yet. Use the AI Tools panel to generate a Korean or English summary.</p>
          </div>
        )}
      </div>
      )}

      {activeTab === 'quiz' && (
      <div style={{ marginBottom: '30px' }}>
        <div className="quiz-toolbar">
          <div>
            <h3>Quiz</h3>
            <p className="subtle-text">Choose a language and answer the questions.</p>
          </div>
          <div className="segmented-control">
            <button
              className={quizLanguage === 'ko' ? 'segment-button segment-button-active' : 'segment-button'}
              onClick={() => handleQuizLanguageChange('ko')}
            >
              Korean
            </button>
            <button
              className={quizLanguage === 'en' ? 'segment-button segment-button-active' : 'segment-button'}
              onClick={() => handleQuizLanguageChange('en')}
            >
              English
            </button>
          </div>
        </div>

        {quizQuestions.length > 0 ? (
        <div className="quiz-study">
          <div className="quiz-progress">
            Question {safeQuizIndex + 1} of {quizQuestions.length}
          </div>
          <div className="quiz-card-layout">
            <button className="card-arrow" onClick={showPreviousQuizQuestion} aria-label="Previous quiz question">
              {'<'}
            </button>
            <div className="quiz-study-card">
              <p className="quiz-question">{currentQuizQuestion.question}</p>
              <div className="quiz-choice-grid">
                {currentQuizQuestion.choices?.map((choice, choiceIndex) => (
                  <button
                    key={`${choice}-${choiceIndex}`}
                    type="button"
                    onClick={() =>
                      setSelectedAnswers((answers) => ({
                        ...answers,
                        [safeQuizIndex]: choiceIndex,
                      }))
                    }
                    className={
                      selectedAnswers[safeQuizIndex] === choiceIndex
                        ? choiceIndex === currentQuizQuestion.answerIndex
                          ? 'quiz-choice quiz-choice-correct'
                          : 'quiz-choice quiz-choice-incorrect'
                        : 'quiz-choice'
                    }
                  >
                    {String.fromCharCode(65 + choiceIndex)}. {choice}
                  </button>
                ))}
              </div>
              {selectedAnswers[safeQuizIndex] !== undefined && (
                <div
                  className={
                    selectedAnswers[safeQuizIndex] === currentQuizQuestion.answerIndex
                      ? 'quiz-feedback quiz-feedback-correct'
                      : 'quiz-feedback quiz-feedback-incorrect'
                  }
                >
                  <strong>
                    {selectedAnswers[safeQuizIndex] === currentQuizQuestion.answerIndex ? 'Correct!' : 'Incorrect.'}
                  </strong>
                  <p>
                    Answer: {String.fromCharCode(65 + currentQuizQuestion.answerIndex)} - {currentQuizQuestion.explanation}
                  </p>
                </div>
              )}
            </div>
            <button className="card-arrow" onClick={showNextQuizQuestion} aria-label="Next quiz question">
              {'>'}
            </button>
          </div>
          <div className="quiz-actions">
            <button className="btn btn-muted" onClick={() => setSelectedAnswers({})}>
              Reset Answers
            </button>
          </div>
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f9fafb',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              display: 'grid',
              gap: '8px',
            }}
          >
            <h4 style={{ margin: 0 }}>Quiz Results</h4>
            <p style={{ margin: 0 }}>
              Correct: <strong style={{ color: '#15803d' }}>{correctCount}</strong> / {quizQuestions.length}
            </p>
            <p style={{ margin: 0 }}>
              Incorrect: <strong style={{ color: '#dc2626' }}>{incorrectCount}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Unanswered: <strong>{unansweredCount}</strong>
            </p>
          </div>
        </div>
        ) : (
          <div className="empty-state">
            <h3>Quiz</h3>
            <p>No {quizLanguage === 'en' ? 'English' : 'Korean'} quiz yet. Use the AI Tools panel to generate one.</p>
          </div>
        )}
      </div>
      )}

      {activeTab === 'flashcards' && (
      <div style={{ marginBottom: '30px' }}>
        <div className="flashcards-tab">
          <div>
            <h3>Flashcards</h3>
            <p className="subtle-text">Study one card at a time, or switch to Edit to manage your cards.</p>
          </div>

          <div className="flashcard-toolbar">
            <div className="segmented-control">
              <button
                className={flashcardMode === 'study' ? 'segment-button segment-button-active' : 'segment-button'}
                onClick={() => setFlashcardMode('study')}
              >
                Study
              </button>
              <button
                className={flashcardMode === 'edit' ? 'segment-button segment-button-active' : 'segment-button'}
                onClick={() => setFlashcardMode('edit')}
              >
                Edit
              </button>
            </div>

            <div className="segmented-control">
              <button
                className={flashcardLanguage === 'ko' ? 'segment-button segment-button-active' : 'segment-button'}
                onClick={() => handleFlashcardLanguageChange('ko')}
              >
                Korean
              </button>
              <button
                className={flashcardLanguage === 'en' ? 'segment-button segment-button-active' : 'segment-button'}
                onClick={() => handleFlashcardLanguageChange('en')}
              >
                English
              </button>
            </div>
          </div>

          {flashcardMode === 'study' ? (
            <div className="flashcard-study">
              {currentFlashcard ? (
                <>
                  <div className="flashcard-progress">
                    Card {safeFlashcardIndex + 1} of {activeFlashcards.length}
                  </div>
                  <div className="study-card-layout">
                    <button className="card-arrow" onClick={showPreviousFlashcard} aria-label="Previous flashcard">
                      {'<'}
                    </button>
                    <button
                      type="button"
                      className="study-card"
                      onClick={() => setStudyCardFlipped((flipped) => !flipped)}
                    >
                      <span>{studyCardFlipped ? 'Back' : 'Front'}</span>
                      <p>{studyCardFlipped ? currentFlashcard.back : currentFlashcard.front}</p>
                    </button>
                    <button className="card-arrow" onClick={showNextFlashcard} aria-label="Next flashcard">
                      {'>'}
                    </button>
                  </div>
                  <p className="subtle-text">Click the card to flip it.</p>
                </>
              ) : (
                <div className="empty-state">
                  <h3>No cards yet</h3>
                  <p>Switch to Edit to add cards manually, or use the AI Tools panel to generate flashcards.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {renderFlashcardSection('ko', 'Korean Flashcards', flashcardsKo)}
              {renderFlashcardSection('en', 'English Flashcards', flashcardsEn)}
            </>
          )}
        </div>
      </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}
