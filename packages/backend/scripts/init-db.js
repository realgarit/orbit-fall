import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

async function resolveToIPv4(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname;
  try {
    const { address } = await dns.promises.lookup(hostname, { family: 4 });
    return address;
  } catch (error) {
    return hostname;
  }
}

async function initDb() {
  let connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  const dbHostMatch = connectionString.match(/@([^/]+)/) || connectionString.match(/\/\/([^/]+)/);
  const dbHost = dbHostMatch ? dbHostMatch[1] : 'unknown';
  const [hostname] = dbHost.split(':');

  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const ipv4 = await resolveToIPv4(hostname);
    if (ipv4 !== hostname) {
      connectionString = connectionString.replace(hostname, ipv4);
    }
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  let client;
  try {
    client = await pool.connect();
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
    if (err.code === "ENETUNREACH") {
      console.warn("⚠️ Could not reach database. This is expected during Render build phase.");
      console.warn("⚠️ Database initialization will be retried during service start.");
      process.exit(0);
    }
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('👋 Database connection closed.');
  }
}

initDb();
