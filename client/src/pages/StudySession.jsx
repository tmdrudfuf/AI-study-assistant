import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function StudySession() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const canSave = title.trim() && text.trim() && !loading;

  const handleSaveSession = async (event) => {
    event.preventDefault();

    if (!canSave) {
      setMessage('Please add both a title and original text.');
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
        throw new Error(data.message || data.error || 'Failed to save study session.');
      }

      navigate(`/study-session/${data.id}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-card">
      <div className="create-session-header">
        <div>
          <h1>New Study Session</h1>
          <p>Add your source material first. You can generate summaries, quizzes, and flashcards after saving.</p>
        </div>
      </div>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      <form className="create-session-layout" onSubmit={handleSaveSession}>
        <div className="create-session-main">
          <div className="form-group">
            <label>Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              type="text"
              placeholder="Example: The Water Cycle"
            />
          </div>

          <div className="form-group">
            <label>Original Text</label>
            <textarea
              className="source-textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows="16"
              placeholder="Paste the notes, article, textbook section, or lecture material you want to study..."
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={!canSave}>
            {loading ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>

        <aside className="create-session-sidebar">
          <h3>Source Stats</h3>
          <div className="source-stat">
            <span>Words</span>
            <strong>{wordCount}</strong>
          </div>
          <div className="source-stat">
            <span>Characters</span>
            <strong>{charCount}</strong>
          </div>
          <div className="source-tip">
            <h4>After saving</h4>
            <p>Open the saved session to create Korean or English summaries, quizzes, and flashcards.</p>
          </div>
        </aside>
      </form>
    </section>
  );
}
