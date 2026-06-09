const db = require('./db');

const userId = Number(process.argv[2] || 1);

function getDateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const sessions = [
  {
    title: 'test1 (Biology)',
    subject: 'Biology',
    due_date: getDateAfter(1),
    original_text:
      'Photosynthesis converts light energy into chemical energy in plants. Chlorophyll captures sunlight, and plants use carbon dioxide and water to produce glucose and oxygen.',
  },
  {
    title: 'test2 (Chemistry)',
    subject: 'Chemistry',
    due_date: getDateAfter(3),
    original_text:
      'Atoms are the basic units of matter. They contain protons, neutrons, and electrons. Chemical bonds form when atoms share or transfer electrons.',
    summary:
      'Core summary:\n- Atoms make up matter.\n- Protons and neutrons are in the nucleus.\n- Electrons influence bonding.',
  },
  {
    title: 'test3 (History)',
    subject: 'History',
    due_date: getDateAfter(7),
    original_text:
      'The Industrial Revolution changed production by introducing machines, factories, and new energy sources. It affected labor, cities, transportation, and global trade.',
    quiz_json: {
      questions: [
        {
          question: 'What changed production during the Industrial Revolution?',
          choices: ['Machines and factories', 'Stone tools', 'Feudal taxes', 'Hand copying'],
          answerIndex: 0,
          explanation: 'Machines and factories transformed production.',
        },
      ],
    },
  },
  {
    title: 'test4 (Math)',
    subject: 'Math',
    due_date: getDateAfter(14),
    original_text:
      'Linear equations describe relationships with a constant rate of change. Their graphs form straight lines, and slope measures how quickly y changes as x changes.',
    flashcards_json: {
      en: {
        cards: [
          {
            front: 'Slope',
            back: 'A value that shows how quickly y changes as x changes.',
          },
        ],
      },
    },
  },
  {
    title: 'test5 (Earth Science)',
    subject: 'Earth Science',
    due_date: getDateAfter(21),
    original_text:
      'The water cycle moves water through evaporation, condensation, precipitation, runoff, and infiltration. It supports ecosystems and provides fresh water.',
    summary:
      'Core summary:\n- Water moves continuously through Earth systems.\n- The Sun powers evaporation.\n- Gravity drives precipitation and runoff.',
    quiz_json: {
      questions: [
        {
          question: 'What powers evaporation?',
          choices: ['The Sun', 'The Moon', 'Gravity only', 'Soil'],
          answerIndex: 0,
          explanation: 'Solar energy causes water to evaporate.',
        },
      ],
    },
    flashcards_json: {
      en: {
        cards: [
          {
            front: 'What is evaporation?',
            back: 'The process where liquid water changes into water vapor.',
          },
        ],
      },
    },
  },
];

async function seed() {
  for (const session of sessions) {
    await db.query(
      `INSERT INTO study_sessions
        (user_id, title, subject, due_date, original_text, summary, summary_en, quiz_json, flashcards_json)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)`,
      [
        userId,
        session.title,
        session.subject,
        session.due_date,
        session.original_text,
        session.summary || null,
        session.quiz_json ? JSON.stringify(session.quiz_json) : null,
        session.flashcards_json ? JSON.stringify(session.flashcards_json) : null,
      ]
    );
  }

  console.log(`Inserted ${sessions.length} dummy study sessions for user ${userId}.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
