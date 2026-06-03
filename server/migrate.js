const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigrations() {
  const migrationPath = path.resolve(__dirname, 'migrations', '001_init_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await db.pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Database migration completed');
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
