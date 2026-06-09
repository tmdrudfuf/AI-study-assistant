-- users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  due_date DATE,
  original_text TEXT,
  summary TEXT,
  summary_ko TEXT,
  summary_en TEXT,
  quiz_json JSONB,
  flashcards_json JSONB,
  annotations_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS summary_ko TEXT;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS summary_en TEXT;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS annotations_json JSONB;
