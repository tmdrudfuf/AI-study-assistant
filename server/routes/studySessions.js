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

module.exports = router;
