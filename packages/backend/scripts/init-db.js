import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('🔌 Connected to database...');

    console.log('🏗️ Creating tables...');

    // Create players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255),
        
        -- Progression
        level INTEGER DEFAULT 1,
        experience BIGINT DEFAULT 0,
        
        -- Currency
        credits BIGINT DEFAULT 0,
        honor BIGINT DEFAULT 0,
        aetherium BIGINT DEFAULT 0,
        
        -- Ship State
        ship_type VARCHAR(50) DEFAULT 'Sparrow',
        current_health INTEGER DEFAULT 4000,
        current_shield INTEGER DEFAULT 0,
        
        -- Position
        last_x INTEGER DEFAULT 1000,
        last_y INTEGER DEFAULT 1000,
        
        -- Equipment (JSONB for flexibility)
        equipment JSONB DEFAULT '{}',
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully.');

    // Check for seed data
    const res = await client.query('SELECT COUNT(*) FROM players');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('🌱 Seeding database...');
      await client.query(`
        INSERT INTO players (username, credits, aetherium, experience)
        VALUES ('TestPilot', 1000, 100, 5000);
      `);
      console.log('✅ Seed data inserted.');
    } else {
      console.log('ℹ️ Database already contains data. Skipping seed.');
    }

  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('👋 Database connection closed.');
  }
}

initDb();
