const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM study_sessions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load study sessions' });
  }
});

router.post('/', async (req, res) => {
  const { title, original_text, summary, quiz_json, flashcards_json } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO study_sessions (user_id, title, original_text, summary, quiz_json, flashcards_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, title, original_text, summary, quiz_json || null, flashcards_json || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create study session' });
  }
});

// 특정 세션 조회
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// 세션 수정
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, original_text, summary } = req.body;
  try {
    const result = await db.query(
      `UPDATE study_sessions 
       SET title = COALESCE($1, title), 
           original_text = COALESCE($2, original_text),
           summary = COALESCE($3, summary)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title || null, original_text || null, summary || null, id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// 세션 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM study_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: 'Session deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// AI 요약 생성 (간단한 버전)
router.post('/:id/summarize', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const text = session.rows[0].original_text;
    
    // 간단한 요약: 첫 문장 + 단어 수 통계
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const firstSentence = sentences[0]?.trim() || '';
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    
    const summary = `📌 원문 통계:\n- 단어 수: ${wordCount}개\n- 문자 수: ${charCount}개\n- 문장 수: ${sentences.length}개\n\n📝 첫 문장:\n${firstSentence}`;

    // DB에 요약 저장
    const updated = await db.query(
      'UPDATE study_sessions SET summary = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [summary, id, req.user.userId]
    );

    res.json({ summary, session: updated.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
