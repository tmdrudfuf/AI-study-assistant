const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/studySessions');
const { runMigrations } = require('./migrate');

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length
  ? configuredOrigins
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

if (isProduction && configuredOrigins.length === 0) {
  throw new Error('CLIENT_URL is required in production.');
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/study-sessions', studyRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AI Study Assistant API is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    const requiredVariables = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
    const missingVariables = requiredVariables.filter((name) => !process.env[name]);
    if (missingVariables.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
    }

    await runMigrations();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Server failed to start:', error.message || error);
    process.exit(1);
  }
}

startServer();
