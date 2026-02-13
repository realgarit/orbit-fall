import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

// You will run this script with: 
// TARGET_DATABASE_URL=postgres://... node scripts/migrate-data.js

const sourceConnectionString = process.env.DATABASE_URL;
const targetConnectionString = process.env.TARGET_DATABASE_URL;

if (!sourceConnectionString || !targetConnectionString) {
  console.error('❌ Error: Missing connection strings.');
  console.error('Usage: TARGET_DATABASE_URL=... npm run db:migrate-data');
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: sourceConnectionString });
const targetPool = new Pool({ 
  connectionString: targetConnectionString,
  ssl: { rejectUnauthorized: false } // Render requires SSL
});

async function migrateData() {
  console.log('🚀 Starting data migration...');
  console.log('SOURCE: Local Database');
  console.log('TARGET: Render Database');

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();

  try {
    // 1. Fetch data from Source
    console.log('📦 Fetching players from source...');
    const res = await sourceClient.query('SELECT * FROM players ORDER BY id ASC');
    const players = res.rows;
    console.log(`found ${players.length} players.`);

    if (players.length === 0) {
      console.log('⚠️ No data to migrate.');
      return;
    }

    // 2. Insert into Target
    console.log('🚚 Transferring data...');
    
    await targetClient.query('BEGIN'); // Start transaction

    for (const p of players) {
      // We construct the query dynamically or explicitly mapped
      await targetClient.query(`
        INSERT INTO players (
          id, username, email, password_hash, 
          level, experience, credits, honor, aetherium, 
          ship_type, current_health, current_shield, 
          last_x, last_y, equipment, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          experience = EXCLUDED.experience,
          credits = EXCLUDED.credits,
          updated_at = NOW();
      `, [
        p.id, p.username, p.email, p.password_hash,
        p.level, p.experience, p.credits, p.honor, p.aetherium,
        p.ship_type, p.current_health, p.current_shield,
        p.last_x, p.last_y, p.equipment,
        p.created_at, p.updated_at
      ]);
    }

    // 3. Reset Sequence
    // This is critical: if you import ID 5, the next auto-generated ID must be 6.
    console.log('🔧 Resetting ID sequences...');
    await targetClient.query(`
      SELECT setval('players_id_seq', (SELECT MAX(id) FROM players));
    `);

    await targetClient.query('COMMIT');
    console.log('✅ Migration successful!');

  } catch (err) {
    await targetClient.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

migrateData();
