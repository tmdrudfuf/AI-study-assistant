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

function parseModelJson(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

function shuffleChoices(question) {
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const answer = choices[question.answerIndex];

  if (choices.length !== 4 || answer === undefined) {
    return question;
  }

  const shuffled = choices.map((choice, index) => ({
    choice,
    isAnswer: index === question.answerIndex,
  }));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return {
    ...question,
    choices: shuffled.map((item) => item.choice),
    answerIndex: shuffled.findIndex((item) => item.isAnswer),
  };
}

function getFlashcardsByLanguage(session, languageCode) {
  const flashcards = session.flashcards_json || {};
  const languageCards = flashcards[languageCode] || { cards: [] };

  return {
    ...flashcards,
    [languageCode]: {
      ...languageCards,
      cards: Array.isArray(languageCards.cards) ? languageCards.cards : [],
    },
  };
}

function getQuizzesByLanguage(session, languageCode) {
  const existingQuiz = session.quiz_json || {};
  const quizzes = existingQuiz.questions ? { ko: existingQuiz } : existingQuiz;
  const languageQuiz = quizzes[languageCode] || { questions: [] };

  return {
    ...quizzes,
    [languageCode]: {
      ...languageQuiz,
      questions: Array.isArray(languageQuiz.questions) ? languageQuiz.questions : [],
    },
  };
}

// AI 요약 생성
router.post('/:id/summarize', async (req, res) => {
  const { id } = req.params;
  const languageCode = req.body?.language === 'en' ? 'en' : 'ko';
  const language = languageCode === 'en' ? 'English' : 'Korean';
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
        `You are an AI study assistant. Summarize study material clearly in ${language}. Focus on accurate concepts, learning value, and review usefulness.`,
      input: `Summarize the following study material in ${language}.

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

    // DB에 언어별 요약 저장
    const summaryColumn = languageCode === 'en' ? 'summary_en' : 'summary_ko';
    const updated = await db.query(
      `UPDATE study_sessions SET ${summaryColumn} = $1, summary = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
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

// AI 퀴즈 생성
router.post('/:id/quiz', async (req, res) => {
  const { id } = req.params;
  const languageCode = req.body?.language === 'en' ? 'en' : 'ko';
  const language = languageCode === 'en' ? 'English' : 'Korean';
  try {
    const session = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentSession = session.rows[0];
    const text = currentSession.original_text;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Original text is required to generate a quiz' });
    }

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      instructions:
        `You are an AI study assistant. Create accurate review quizzes in ${language} from study material. Return only valid JSON with no markdown.`,
      input: `Create a study quiz in ${language} from the following material.

Return only JSON in this exact shape:
{
  "questions": [
    {
      "question": "Question text in ${language}",
      "choices": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "explanation": "Short explanation in ${language}"
    }
  ]
}

Rules:
- Create 5 multiple-choice questions.
- Each question must have exactly 4 choices.
- answerIndex must be 0, 1, 2, or 3.
- Focus on important concepts, not tiny details.

Study material:
${text}`,
    });

    const output = response.output_text?.trim();
    if (!output) {
      throw new Error('OpenAI returned an empty quiz');
    }

    const quiz = parseModelJson(output);
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error('OpenAI returned an invalid quiz format');
    }

    quiz.questions = quiz.questions.map(shuffleChoices);
    const quizzes = {
      ...getQuizzesByLanguage(currentSession, languageCode),
      [languageCode]: quiz,
    };

    const updated = await db.query(
      'UPDATE study_sessions SET quiz_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(quizzes), id, req.user.userId]
    );

    res.json({ quiz, quizzes, session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    res.status(500).json({
      error: 'Failed to generate quiz',
      detail: error.message || 'Unknown error',
    });
  }
});

// AI flashcards generation
router.post('/:id/flashcards', async (req, res) => {
  const { id } = req.params;
  const languageCode = req.body?.language === 'en' ? 'en' : 'ko';
  const language = languageCode === 'en' ? 'English' : 'Korean';

  try {
    const session = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentSession = session.rows[0];
    const text = currentSession.original_text;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Original text is required to generate flashcards' });
    }

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      instructions:
        `You are an AI study assistant. Create useful flashcards in ${language}. Return only valid JSON with no markdown.`,
      input: `Create flashcards in ${language} from the following study material.

Return only JSON in this exact shape:
{
  "cards": [
    {
      "front": "Question, term, or prompt in ${language}",
      "back": "Answer or explanation in ${language}"
    }
  ]
}

Rules:
- Create 8 flashcards.
- Keep the front short.
- Make the back clear and useful for review.
- Focus on key concepts, definitions, processes, and cause/effect relationships.

Study material:
${text}`,
    });

    const output = response.output_text?.trim();
    if (!output) {
      throw new Error('OpenAI returned empty flashcards');
    }

    const generated = parseModelJson(output);
    if (!Array.isArray(generated.cards) || generated.cards.length === 0) {
      throw new Error('OpenAI returned an invalid flashcards format');
    }

    const flashcards = {
      ...(currentSession.flashcards_json || {}),
      [languageCode]: generated,
    };

    const updated = await db.query(
      'UPDATE study_sessions SET flashcards_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(flashcards), id, req.user.userId]
    );

    res.json({ flashcards, session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to generate flashcards:', error);
    res.status(500).json({
      error: 'Failed to generate flashcards',
      detail: error.message || 'Unknown error',
    });
  }
});

// Manual flashcard creation
router.post('/:id/flashcards/manual', async (req, res) => {
  const { id } = req.params;
  const languageCode = req.body?.language === 'en' ? 'en' : 'ko';
  const { front, back } = req.body;

  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ error: 'Front and back are required' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const flashcards = getFlashcardsByLanguage(result.rows[0], languageCode);
    flashcards[languageCode].cards.push({
      front: front.trim(),
      back: back.trim(),
      source: 'manual',
    });

    const updated = await db.query(
      'UPDATE study_sessions SET flashcards_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(flashcards), id, req.user.userId]
    );

    res.status(201).json({ session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to add flashcard:', error);
    res.status(500).json({
      error: 'Failed to add flashcard',
      detail: error.message || 'Unknown error',
    });
  }
});

// Manual flashcard update
router.put('/:id/flashcards/:language/:cardIndex', async (req, res) => {
  const { id, cardIndex } = req.params;
  const languageCode = req.params.language === 'en' ? 'en' : 'ko';
  const index = Number(cardIndex);
  const { front, back } = req.body;

  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid flashcard index' });
  }

  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ error: 'Front and back are required' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const flashcards = getFlashcardsByLanguage(result.rows[0], languageCode);
    if (!flashcards[languageCode].cards[index]) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    flashcards[languageCode].cards[index] = {
      ...flashcards[languageCode].cards[index],
      front: front.trim(),
      back: back.trim(),
    };

    const updated = await db.query(
      'UPDATE study_sessions SET flashcards_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(flashcards), id, req.user.userId]
    );

    res.json({ session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to update flashcard:', error);
    res.status(500).json({
      error: 'Failed to update flashcard',
      detail: error.message || 'Unknown error',
    });
  }
});

// Manual flashcard delete
router.delete('/:id/flashcards/:language/:cardIndex', async (req, res) => {
  const { id, cardIndex } = req.params;
  const languageCode = req.params.language === 'en' ? 'en' : 'ko';
  const index = Number(cardIndex);

  if (!Number.isInteger(index) || index < 0) {
    return res.status(400).json({ error: 'Invalid flashcard index' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const flashcards = getFlashcardsByLanguage(result.rows[0], languageCode);
    if (!flashcards[languageCode].cards[index]) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    flashcards[languageCode].cards.splice(index, 1);

    const updated = await db.query(
      'UPDATE study_sessions SET flashcards_json = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [JSON.stringify(flashcards), id, req.user.userId]
    );

    res.json({ session: updated.rows[0] });
  } catch (error) {
    console.error('Failed to delete flashcard:', error);
    res.status(500).json({
      error: 'Failed to delete flashcard',
      detail: error.message || 'Unknown error',
    });
  }
});

module.exports = router;
