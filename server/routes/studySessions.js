const express = require('express');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const isPlaceholder =
    apiKey &&
    (apiKey.includes('your_openai_api_key_here') ||
      apiKey.includes('OpenAI_API_KEY') ||
      apiKey.includes('실제') ||
      apiKey.includes('ë„ˆ'));

  if (!apiKey || isPlaceholder) {
    throw new Error('OPENAI_API_KEY is not configured. Set OPENAI_API_KEY in server/.env.');
  }

  return new OpenAI({
    apiKey,
  });
}

// AI 요약 생성
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

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Original text is required to generate a summary' });
    }

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      instructions:
        'You are an AI study assistant. Summarize study material clearly in Korean. Focus on accurate concepts, learning value, and review usefulness.',
      input: `Summarize the following study material in Korean.

Use this structure:
1. Core summary: 4-6 bullet points
2. Important concepts: terms with short explanations
3. Review questions: 3 questions
4. One-sentence takeaway

Study material:
${text}`,
    });

    const summary = response.output_text?.trim();
    if (!summary) {
      throw new Error('OpenAI returned an empty summary');
    }

    // DB에 요약 저장
    const updated = await db.query(
      'UPDATE study_sessions SET summary = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [summary, id, req.user.userId]
    );

    res.json({ summary, session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to generate summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      detail: error.message || 'Unknown error',
    });
  }
});

module.exports = router;
