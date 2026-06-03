import { useState } from 'react';

export default function StudySession() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  return (
    <section className="page-card">
      <h1>Study Session</h1>
      <div className="form-group">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" />
      </div>
      <div className="form-group">
        <label>Original Text</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows="8" />
      </div>
      <button type="button">Save Session</button>
    </section>
  );
}
