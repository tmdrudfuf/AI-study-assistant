import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

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
  const [savingChanges, setSavingChanges] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [flippedFlashcards, setFlippedFlashcards] = useState({});

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/api/study-sessions/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '세션을 불러올 수 없습니다.');
        }

        setSession(data);
        setEditTitle(data.title);
        setEditText(data.original_text);
      } catch (err) {
        setError(`❌ 오류: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, token, navigate]);

  const handleSaveChanges = async () => {
    if (!editTitle.trim() || !editText.trim()) {
      setError('제목과 텍스트를 입력해주세요.');
      return;
    }

    setSavingChanges(true);
    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}`, {
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
        throw new Error(data.error || '수정에 실패했습니다.');
      }

      setSession(data);
      setIsEditing(false);
      setError('');
      // 성공 메시지 표시
      alert('✅ 세션이 수정되었습니다.');
    } catch (err) {
      setError(`❌ 오류: ${err.message}`);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleGenerateSummary = async (language) => {
    setGeneratingSummary(true);
    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || '요약 생성에 실패했습니다.');
      }

      setSession(data.session);
      setError('');
      alert('✅ 요약이 생성되었습니다.');
    } catch (err) {
      setError(`❌ 오류: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateQuiz = async (language) => {
    setGeneratingQuiz(true);
    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || '퀴즈 생성에 실패했습니다.');
      }

      setSession(data.session);
      setSelectedAnswers({});
      setError('');
      alert('✅ 퀴즈가 생성되었습니다.');
    } catch (err) {
      setError(`❌ 오류: ${err.message}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async (language) => {
    setGeneratingFlashcards(true);
    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}/flashcards`, {
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
      setError('');
      alert('Flashcards generated.');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('정말 이 세션을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      alert('✅ 세션이 삭제되었습니다.');
      navigate('/dashboard');
    } catch (err) {
      setError(`❌ 오류: ${err.message}`);
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

  const quizQuestions = session?.quiz_json?.questions || [];
  const answeredCount = quizQuestions.filter((_, index) => selectedAnswers[index] !== undefined).length;
  const correctCount = quizQuestions.filter(
    (item, index) => selectedAnswers[index] !== undefined && selectedAnswers[index] === item.answerIndex
  ).length;
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = quizQuestions.length - answeredCount;
  const flashcardsKo = session?.flashcards_json?.ko?.cards || [];
  const flashcardsEn = session?.flashcards_json?.en?.cards || [];

  const toggleFlashcard = (language, index) => {
    const cardKey = `${language}-${index}`;
    setFlippedFlashcards((cards) => ({
      ...cards,
      [cardKey]: !cards[cardKey],
    }));
  };

  if (loading) return <section className="page-card"><p>로딩 중...</p></section>;

  if (!session) return <section className="page-card"><p>세션을 찾을 수 없습니다.</p></section>;

  return (
    <section className="page-card">
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px' }}>
        ← Dashboard로 돌아가기
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {!isEditing ? (
          <>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ✏️ 수정
            </button>
            <button
              onClick={() => handleGenerateSummary('ko')}
              disabled={generatingSummary}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingSummary ? 0.7 : 1,
              }}
            >
              {generatingSummary ? '생성 중...' : '✨ 요약 생성 (한글)'}
            </button>
            <button
              onClick={() => handleGenerateSummary('en')}
              disabled={generatingSummary}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0f766e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingSummary ? 0.7 : 1,
              }}
            >
              {generatingSummary ? 'Generating...' : '✨ Summary (English)'}
            </button>
            <button
              onClick={() => handleGenerateQuiz('ko')}
              disabled={generatingQuiz}
              style={{
                padding: '10px 20px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingQuiz ? 0.7 : 1,
              }}
            >
              {generatingQuiz ? '생성 중...' : '🧠 퀴즈 생성 (한글)'}
            </button>
            <button
              onClick={() => handleGenerateQuiz('en')}
              disabled={generatingQuiz}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9333ea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingQuiz ? 0.7 : 1,
              }}
            >
              {generatingQuiz ? 'Generating...' : '🧠 Quiz (English)'}
            </button>
            <button
              onClick={() => handleGenerateFlashcards('ko')}
              disabled={generatingFlashcards}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingFlashcards ? 0.7 : 1,
              }}
            >
              {generatingFlashcards ? 'Generating...' : 'Flashcards (Korean)'}
            </button>
            <button
              onClick={() => handleGenerateFlashcards('en')}
              disabled={generatingFlashcards}
              style={{
                padding: '10px 20px',
                backgroundColor: '#d97706',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: generatingFlashcards ? 0.7 : 1,
              }}
            >
              {generatingFlashcards ? 'Generating...' : 'Flashcards (English)'}
            </button>
            <button
              onClick={handleDeleteSession}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              🗑️ 삭제
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleSaveChanges}
              disabled={savingChanges}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                opacity: savingChanges ? 0.7 : 1,
              }}
            >
              {savingChanges ? '저장 중...' : '💾 저장'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditTitle(session.title);
                setEditText(session.original_text);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ✕ 취소
            </button>
          </>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>📝 원본 텍스트</h3>
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

      {(session.summary_ko || session.summary_en || session.summary) && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>✨ 요약</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {(session.summary_ko || (!session.summary_en && session.summary)) && (
              <div
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
                <h4 style={{ marginTop: 0 }}>한국어 요약</h4>
                {session.summary_ko || session.summary}
              </div>
            )}
            {session.summary_en && (
              <div
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
                <h4 style={{ marginTop: 0 }}>English Summary</h4>
                {session.summary_en}
              </div>
            )}
          </div>
        </div>
      )}

      {quizQuestions.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>🧠 퀴즈</h3>
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => setSelectedAnswers({})}
              style={{
                padding: '8px 14px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              다시 풀기
            </button>
          </div>
          <div style={{ display: 'grid', gap: '15px' }}>
            {quizQuestions.map((item, questionIndex) => (
              <div
                key={`${item.question}-${questionIndex}`}
                style={{
                  backgroundColor: '#faf5ff',
                  padding: '15px',
                  borderRadius: '4px',
                  border: '1px solid #d8b4fe',
                }}
              >
                <p style={{ fontWeight: 'bold', marginTop: 0 }}>
                  {questionIndex + 1}. {item.question}
                </p>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                  {item.choices?.map((choice, choiceIndex) => (
                    <button
                      key={`${choice}-${choiceIndex}`}
                      type="button"
                      onClick={() =>
                        setSelectedAnswers((answers) => ({
                          ...answers,
                          [questionIndex]: choiceIndex,
                        }))
                      }
                      style={{
                        padding: '10px',
                        textAlign: 'left',
                        backgroundColor:
                          selectedAnswers[questionIndex] === choiceIndex
                            ? choiceIndex === item.answerIndex
                              ? '#dcfce7'
                              : '#fee2e2'
                            : 'white',
                        color: '#374151',
                        border:
                          selectedAnswers[questionIndex] === choiceIndex
                            ? choiceIndex === item.answerIndex
                              ? '2px solid #16a34a'
                              : '2px solid #dc2626'
                            : '1px solid #d1d5db',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedAnswers[questionIndex] === choiceIndex ? 'bold' : 'normal',
                      }}
                    >
                      {String.fromCharCode(65 + choiceIndex)}. {choice}
                    </button>
                  ))}
                </div>
                {selectedAnswers[questionIndex] !== undefined && (
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '4px',
                      backgroundColor:
                        selectedAnswers[questionIndex] === item.answerIndex ? '#f0fdf4' : '#fef2f2',
                      color: selectedAnswers[questionIndex] === item.answerIndex ? '#166534' : '#991b1b',
                    }}
                  >
                    <strong>
                      {selectedAnswers[questionIndex] === item.answerIndex ? '정답입니다!' : '오답입니다.'}
                    </strong>
                    <p style={{ margin: '6px 0 0 0' }}>
                      정답: {String.fromCharCode(65 + item.answerIndex)} - {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
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
            <h4 style={{ margin: 0 }}>퀴즈 결과</h4>
            <p style={{ margin: 0 }}>
              맞은 개수: <strong style={{ color: '#15803d' }}>{correctCount}</strong> / {quizQuestions.length}
            </p>
            <p style={{ margin: 0 }}>
              틀린 개수: <strong style={{ color: '#dc2626' }}>{incorrectCount}</strong>
            </p>
            <p style={{ margin: 0 }}>
              아직 안 푼 문제: <strong>{unansweredCount}</strong>
            </p>
          </div>
        </div>
      )}

      {(flashcardsKo.length > 0 || flashcardsEn.length > 0) && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>Flashcards</h3>

          {flashcardsKo.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <h4>Korean Flashcards</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {flashcardsKo.map((card, index) => {
                  const cardKey = `ko-${index}`;
                  const isFlipped = Boolean(flippedFlashcards[cardKey]);

                  return (
                    <button
                      key={cardKey}
                      type="button"
                      onClick={() => toggleFlashcard('ko', index)}
                      style={{
                        minHeight: '150px',
                        padding: '16px',
                        backgroundColor: isFlipped ? '#fff7ed' : '#fffbeb',
                        color: '#1f2937',
                        border: '1px solid #fbbf24',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        lineHeight: '1.5',
                      }}
                    >
                      <strong>{isFlipped ? 'Back' : 'Front'}</strong>
                      <p style={{ marginBottom: 0 }}>{isFlipped ? card.back : card.front}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {flashcardsEn.length > 0 && (
            <div>
              <h4>English Flashcards</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {flashcardsEn.map((card, index) => {
                  const cardKey = `en-${index}`;
                  const isFlipped = Boolean(flippedFlashcards[cardKey]);

                  return (
                    <button
                      key={cardKey}
                      type="button"
                      onClick={() => toggleFlashcard('en', index)}
                      style={{
                        minHeight: '150px',
                        padding: '16px',
                        backgroundColor: isFlipped ? '#fff7ed' : '#fffbeb',
                        color: '#1f2937',
                        border: '1px solid #fbbf24',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        lineHeight: '1.5',
                      }}
                    >
                      <strong>{isFlipped ? 'Back' : 'Front'}</strong>
                      <p style={{ marginBottom: 0 }}>{isFlipped ? card.back : card.front}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
          Dashboard로 돌아가기
        </button>
      </div>
    </section>
  );
}
