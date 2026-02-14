import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

async function initDb() {
  const connectionString = process.env.PREVIEW_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or PREVIEW_DATABASE_URL is missing.');
    process.exit(1);
  }

  // Log connection attempt (hiding password)
  const isStaging = !!process.env.PREVIEW_DATABASE_URL;
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Connecting to ${isStaging ? 'STAGING' : 'PRODUCTION'} database: ${maskedUrl}`);

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected successfully.');

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
        
        -- Registration tracking
        registration_ip VARCHAR(45),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully.');

    // Ensure registration_ip column exists (Migration)
    console.log('🔍 Checking for missing columns...');
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='registration_ip') THEN
          ALTER TABLE players ADD COLUMN registration_ip VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='honor') THEN
          ALTER TABLE players ADD COLUMN honor BIGINT DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='aetherium') THEN
          ALTER TABLE players ADD COLUMN aetherium BIGINT DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='cargo') THEN
          ALTER TABLE players ADD COLUMN cargo JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='ammo') THEN
          ALTER TABLE players ADD COLUMN ammo JSONB DEFAULT '{}';
        END IF;
      END $$;
    `);

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
    console.error('❌ Error initializing database:', err.message);
    if (err.message.includes('getaddrinfo') || err.message.includes('connect ETIMEDOUT')) {
      console.error('💡 HINT: If you are on Render/Vercel, ensure you are using the Supabase "Transaction Pooler" connection string (port 6543) which supports IPv4, not the "Direct" connection string (port 5432) which is often IPv6 only.');
    }
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