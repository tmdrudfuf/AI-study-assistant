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

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await fetch(`http://localhost:4000/api/study-sessions/${id}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
              onClick={handleGenerateSummary}
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
              {generatingSummary ? '생성 중...' : '✨ 요약 생성'}
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

      {session.summary && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>✨ 요약</h3>
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
            {session.summary}
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
          Dashboard로 돌아가기
        </button>
      </div>
    </section>
  );
}
