import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function StudySession() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // 로그인 확인
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSaveSession = async (e) => {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      setMessage('제목과 텍스트를 입력해주세요.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:4000/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          original_text: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '세션 저장에 실패했습니다.');
      }

      setMessage(`✅ 세션 저장 완료! (ID: ${data.id})`);
      setTitle('');
      setText('');

      // 3초 후 메시지 제거
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-card">
      <h1>Study Session</h1>
      {message && <p style={{ color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
      <form onSubmit={handleSaveSession}>
        <div className="form-group">
          <label>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="세션 제목 입력..."
          />
        </div>
        <div className="form-group">
          <label>Original Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows="8"
            placeholder="공부할 텍스트 입력..."
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? '저장 중...' : 'Save Session'}
        </button>
      </form>
    </section>
  );
}
