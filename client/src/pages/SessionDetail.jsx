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
  const [editSubject, setEditSubject] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editText, setEditText] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [selectionRange, setSelectionRange] = useState(null);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [openAnnotation, setOpenAnnotation] = useState(null);
  const [editingSummaryLanguage, setEditingSummaryLanguage] = useState(null);
  const [editSummaryText, setEditSummaryText] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);
  const [savingAnnotations, setSavingAnnotations] = useState(false);
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
        setEditSubject(data.subject || '');
        setEditDueDate(data.due_date ? data.due_date.slice(0, 10) : '');
        setEditText(data.original_text);
        setAnnotations(Array.isArray(data.annotations_json) ? data.annotations_json : []);
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

    const originalTextChanged = editText !== session.original_text;
    const hasOriginalTextAnnotations = annotations.some(
      (annotation) => (annotation.target || 'original_text') === 'original_text'
    );
    if (
      originalTextChanged &&
      hasOriginalTextAnnotations &&
      !window.confirm('Changing the original text will remove its highlights and comments. Continue?')
    ) {
      return;
    }

    const nextAnnotations = originalTextChanged
      ? annotations.filter((annotation) => (annotation.target || 'original_text') !== 'original_text')
      : annotations;

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
          subject: editSubject,
          due_date: editDueDate || null,
          original_text: editText,
          annotations_json: nextAnnotations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update this session.');
      }

      setSession(data);
      setAnnotations(Array.isArray(data.annotations_json) ? data.annotations_json : []);
      setOpenAnnotation(null);
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

  const getNodeTextOffset = (container, targetNode, targetOffset) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let currentNode = walker.nextNode();

    while (currentNode) {
      if (currentNode === targetNode) {
        return offset + targetOffset;
      }
      offset += currentNode.textContent.length;
      currentNode = walker.nextNode();
    }

    return offset;
  };

  const handleTextSelection = (containerId, text, target) => {
    const selection = window.getSelection();
    const container = document.getElementById(containerId);

    if (!selection || !container || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionRange(null);
      setSelectionMenuPosition(null);
      setShowCommentInput(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      setSelectionRange(null);
      setSelectionMenuPosition(null);
      setShowCommentInput(false);
      return;
    }

    const start = getNodeTextOffset(container, range.startContainer, range.startOffset);
    const end = getNodeTextOffset(container, range.endContainer, range.endOffset);
    const normalizedStart = Math.min(start, end);
    const normalizedEnd = Math.max(start, end);
    const selectedText = text.slice(normalizedStart, normalizedEnd).trim();

    if (!selectedText) {
      setSelectionRange(null);
      setSelectionMenuPosition(null);
      setShowCommentInput(false);
      return;
    }

    const rect = range.getBoundingClientRect();

    setSelectionRange({
      start: normalizedStart,
      end: normalizedEnd,
      text: text.slice(normalizedStart, normalizedEnd),
      target,
    });
    setCommentDraft('');
    setShowCommentInput(false);
    setSelectionMenuPosition({
      top: rect.bottom + window.scrollY + 8,
      left: Math.max(
        window.scrollX + 12,
        Math.min(rect.right + window.scrollX - 170, window.scrollX + window.innerWidth - 232)
      ),
    });
  };

  const saveAnnotations = async (nextAnnotations) => {
    setSavingAnnotations(true);
    try {
      const response = await fetch(`${API_URL}/api/study-sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ annotations_json: nextAnnotations }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save annotations.');
      }

      setSession(data);
      setAnnotations(Array.isArray(data.annotations_json) ? data.annotations_json : []);
      setSelectionRange(null);
      setSelectionMenuPosition(null);
      setCommentDraft('');
      setShowCommentInput(false);
      window.getSelection()?.removeAllRanges();
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSavingAnnotations(false);
    }
  };

  const addAnnotation = (type, note = '') => {
    if (!selectionRange) return;

    const nextAnnotations = [
      ...annotations,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        target: selectionRange.target,
        start: selectionRange.start,
        end: selectionRange.end,
        text: selectionRange.text,
        note: note.trim(),
        color: type === 'comment' ? 'blue' : 'yellow',
        createdAt: new Date().toISOString(),
      },
    ].sort((a, b) => a.start - b.start);

    saveAnnotations(nextAnnotations);
  };

  const deleteAnnotation = (annotationId) => {
    const nextAnnotations = annotations.filter((annotation) => annotation.id !== annotationId);
    saveAnnotations(nextAnnotations);
  };

  const renderAnnotatedText = (text, target) => {
    const validAnnotations = annotations
      .filter((annotation) => (annotation.target || 'original_text') === target)
      .filter((annotation) => Number.isInteger(annotation.start) && Number.isInteger(annotation.end))
      .filter((annotation) => annotation.start >= 0 && annotation.end <= text.length && annotation.start < annotation.end);

    if (validAnnotations.length === 0) return text;

    const boundaries = new Set([0, text.length]);
    validAnnotations.forEach((annotation) => {
      boundaries.add(annotation.start);
      boundaries.add(annotation.end);
    });

    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);

    return sortedBoundaries.slice(0, -1).map((start, index) => {
      const end = sortedBoundaries[index + 1];
      const value = text.slice(start, end);
      const annotation = validAnnotations
        .filter((item) => item.start <= start && item.end >= end)
        .at(-1);

      if (!annotation) return <span key={`${start}-${end}`}>{value}</span>;

      return (
        <mark
          key={`${annotation.id}-${start}-${end}`}
          className={annotation.type === 'comment' ? 'annotated-text annotated-comment' : 'annotated-text'}
          title={annotation.note || annotation.text}
          onClick={() => setOpenAnnotation(annotation)}
        >
          {value}
        </mark>
      );
    });
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

    const annotationTarget = editingSummaryLanguage === 'en' ? 'summary_en' : 'summary_ko';
    const currentSummary =
      editingSummaryLanguage === 'en'
        ? session.summary_en || ''
        : session.summary_ko || session.summary || '';
    const summaryChanged = editSummaryText !== currentSummary;
    const hasSummaryAnnotations = annotations.some(
      (annotation) => (annotation.target || 'original_text') === annotationTarget
    );
    if (
      summaryChanged &&
      hasSummaryAnnotations &&
      !window.confirm('Changing this summary will remove its highlights and comments. Continue?')
    ) {
      return;
    }

    const nextAnnotations = summaryChanged
      ? annotations.filter(
          (annotation) => (annotation.target || 'original_text') !== annotationTarget
        )
      : annotations;

    setSavingChanges(true);
    try {
      const payload =
        editingSummaryLanguage === 'en'
          ? { summary_en: editSummaryText, annotations_json: nextAnnotations }
          : {
              summary_ko: editSummaryText,
              summary: editSummaryText,
              annotations_json: nextAnnotations,
            };

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
      setAnnotations(Array.isArray(data.annotations_json) ? data.annotations_json : []);
      setOpenAnnotation(null);
      cancelEditingSummary();
      setError('');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleGenerateSummary = async (language) => {
    const annotationTarget = language === 'en' ? 'summary_en' : 'summary_ko';
    const hasSummaryAnnotations = annotations.some(
      (annotation) => (annotation.target || 'original_text') === annotationTarget
    );
    if (
      hasSummaryAnnotations &&
      !window.confirm('Generating a new summary will remove its highlights and comments. Continue?')
    ) {
      return;
    }

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
      setAnnotations(Array.isArray(data.session.annotations_json) ? data.session.annotations_json : []);
      setOpenAnnotation(null);
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

  const formatDueDate = (dateString) => {
    if (!dateString) return 'No due date';
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
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(`${dateString.slice(0, 10)}T00:00:00`);
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
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

  const renderAnnotationMenu = () => {
    if (!selectionRange || !selectionMenuPosition) return null;

    return (
      <div
        className="annotation-context-menu"
        style={{
          top: `${selectionMenuPosition.top}px`,
          left: `${selectionMenuPosition.left}px`,
        }}
      >
        <span>{selectionRange.text.trim().slice(0, 48)}</span>
        <button className="mini-button" onClick={() => addAnnotation('highlight')} disabled={savingAnnotations}>
          Highlight
        </button>
        <button className="mini-button" onClick={() => setShowCommentInput(true)} disabled={savingAnnotations}>
          Comment
        </button>
        {showCommentInput && (
          <div className="annotation-comment-form">
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Write a note..."
              rows="3"
              autoFocus
            />
            <button
              className="mini-button"
              onClick={() => addAnnotation('comment', commentDraft)}
              disabled={savingAnnotations || !commentDraft.trim()}
            >
              Save Note
            </button>
          </div>
        )}
        <button
          className="mini-button"
          onClick={() => {
            setSelectionRange(null);
            setSelectionMenuPosition(null);
            setShowCommentInput(false);
            setCommentDraft('');
            window.getSelection()?.removeAllRanges();
          }}
        >
          Clear
        </button>
      </div>
    );
  };

  const renderAnnotationSidePanel = (target) => {
    const targetAnnotation =
      openAnnotation && (openAnnotation.target || 'original_text') === target ? openAnnotation : null;

    return (
      <aside className="annotation-side-panel">
        {targetAnnotation ? (
          <>
            <div className="annotation-side-header">
              <strong>{targetAnnotation.type === 'comment' ? 'Comment' : 'Highlight'}</strong>
              <button
                className="annotation-dialog-close"
                onClick={() => setOpenAnnotation(null)}
                aria-label="Close annotation"
              >
                X
              </button>
            </div>
            <blockquote>{targetAnnotation.text}</blockquote>
            {targetAnnotation.note ? (
              <p>{targetAnnotation.note}</p>
            ) : (
              <p className="subtle-text">No comment was added to this highlight.</p>
            )}
            <button
              className="mini-button mini-button-danger"
              onClick={() => {
                deleteAnnotation(targetAnnotation.id);
                setOpenAnnotation(null);
              }}
              disabled={savingAnnotations}
            >
              Delete
            </button>
          </>
        ) : (
          <div className="annotation-side-empty">
            <strong>Comments</strong>
            <p>Click a highlighted section to view its note.</p>
          </div>
        )}
      </aside>
    );
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
          className="btn btn-primary"
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
                        className="btn btn-primary"
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

      {error && <p className="message message-error">{error}</p>}

      <div className="session-detail-header">
        <div className="session-detail-heading">
          <div>
            {isEditing ? (
              <div className="session-title-edit">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    padding: '8px',
                    border: '2px solid #2563eb',
                    borderRadius: '4px',
                    width: '100%',
                  }}
                />
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Subject"
                />
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            ) : (
              <>
                <h1 style={{ margin: '0 0 10px 0' }}>{session.title}</h1>
                <div className="session-tag-row">
                  {session.subject && <span className="subject-badge">{session.subject}</span>}
                  {session.due_date && (
                    <span className="due-date-badge">
                      Due {formatDueDate(session.due_date)} · {getDueDateStatus(session.due_date)}
                    </span>
                  )}
                </div>
              </>
            )}
            <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
              📅 {formatDate(session.created_at)} | 🆔 #{session.id}
            </p>
          </div>
          <div className="session-header-actions">
            {isEditing ? (
              <>
                <button className="btn btn-primary" onClick={handleSaveChanges} disabled={savingChanges}>
                  {savingChanges ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(session.title);
                    setEditSubject(session.subject || '');
                    setEditDueDate(session.due_date ? session.due_date.slice(0, 10) : '');
                    setEditText(session.original_text);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={handleDeleteSession}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!isEditing && (
        <div className="session-actions">
          <div className="action-panel action-panel-wide">
              <h3>AI Tools</h3>
              <div className="tool-grid">
                <div className="tool-group">
                  <h4>Summary</h4>
                  <div className="action-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleGenerateSummary('ko')}
                      disabled={generatingSummary}
                    >
                      {generatingSummary ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-secondary"
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
                      className="btn btn-primary"
                      onClick={() => handleGenerateQuiz('ko')}
                      disabled={generatingQuiz}
                    >
                      {generatingQuiz ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-secondary"
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
                      className="btn btn-primary"
                      onClick={() => handleGenerateFlashcards('ko')}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? 'Generating...' : 'Korean'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleGenerateFlashcards('en')}
                      disabled={generatingFlashcards}
                    >
                      {generatingFlashcards ? 'Generating...' : 'English'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

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

      {renderAnnotationMenu()}

      {activeTab === 'text' && (
      <div style={{ marginBottom: '30px' }}>
        <div className="original-text-header">
          <div>
            <h3>Original Text</h3>
            <p className="subtle-text">Select text to highlight it or add a note.</p>
          </div>
          {annotations.filter((annotation) => (annotation.target || 'original_text') === 'original_text').length > 0 && (
            <span className="annotation-count">
              {annotations.filter((annotation) => (annotation.target || 'original_text') === 'original_text').length} annotations
            </span>
          )}
        </div>
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
          <>
            <div className="original-text-workspace">
              <div
                id="original-text-reader"
                className="original-text-reader"
                onMouseUp={() =>
                  handleTextSelection('original-text-reader', session.original_text || '', 'original_text')
                }
                onKeyUp={() =>
                  handleTextSelection('original-text-reader', session.original_text || '', 'original_text')
                }
              >
                {renderAnnotatedText(session.original_text || '', 'original_text')}
              </div>

              {renderAnnotationSidePanel('original_text')}
            </div>

          </>
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
                  backgroundColor: '#ffffff',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dfe4ec',
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
                      <button className="btn btn-primary" onClick={handleSaveSummary} disabled={savingChanges || !editSummaryText.trim()}>
                        {savingChanges ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-muted" onClick={cancelEditingSummary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="summary-annotation-workspace">
                    <div
                      id="summary-ko-reader"
                      className="summary-text-reader"
                      onMouseUp={() =>
                        handleTextSelection(
                          'summary-ko-reader',
                          session.summary_ko || session.summary || '',
                          'summary_ko'
                        )
                      }
                      onKeyUp={() =>
                        handleTextSelection(
                          'summary-ko-reader',
                          session.summary_ko || session.summary || '',
                          'summary_ko'
                        )
                      }
                    >
                      {renderAnnotatedText(session.summary_ko || session.summary || '', 'summary_ko')}
                    </div>
                    {renderAnnotationSidePanel('summary_ko')}
                  </div>
                )}
              </div>
            )}
            {session.summary_en && (
              <div
                className="summary-panel"
                style={{
                  backgroundColor: '#ffffff',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dfe4ec',
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
                      <button className="btn btn-primary" onClick={handleSaveSummary} disabled={savingChanges || !editSummaryText.trim()}>
                        {savingChanges ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-muted" onClick={cancelEditingSummary}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="summary-annotation-workspace">
                    <div
                      id="summary-en-reader"
                      className="summary-text-reader"
                      onMouseUp={() =>
                        handleTextSelection('summary-en-reader', session.summary_en || '', 'summary_en')
                      }
                      onKeyUp={() =>
                        handleTextSelection('summary-en-reader', session.summary_en || '', 'summary_en')
                      }
                    >
                      {renderAnnotatedText(session.summary_en || '', 'summary_en')}
                    </div>
                    {renderAnnotationSidePanel('summary_en')}
                  </div>
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
              backgroundColor: '#f8fafc',
              border: '1px solid #dfe4ec',
              borderRadius: '8px',
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
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
          >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}
