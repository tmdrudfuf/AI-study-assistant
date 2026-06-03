const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/studySessions');
const { runMigrations } = require('./migrate');

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/study-sessions', studyRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AI Study Assistant API is running' });
});

async function startServer() {
  try {
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
