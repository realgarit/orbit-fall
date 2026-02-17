import mssql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables - don't fail if .env is missing
try {
  dotenv.config({ path: '.env' });
} catch (e) {
  // Ignore errors - we'll use environment variables from Azure
}

// Database configuration
const config = {
  server: process.env.DB_HOST || 'orbitfall-sql-server.database.windows.net',
  database: process.env.DB_NAME || 'orbitfall-db',
  user: process.env.DB_USER || 'orbitfalladmin',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

// Build connection string from individual env vars
if (process.env.DB_HOST) {
  config.connectionString = `Server=${config.server};Database=${config.database};User Id=${config.user};Password=${config.password};Encrypt=true;TrustServerCertificate=false;`;
}

async function initDb() {
  console.log('🔌 Connecting to Azure SQL database...');

  let pool;
  try {
    pool = await mssql.connect(config);
    console.log('✅ Connected successfully.');

    console.log('🏗️ Creating tables...');

    // Create players table
    await pool.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'players')
      CREATE TABLE players (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        password_hash VARCHAR(255),
        
        -- Progression
        level INT DEFAULT 1,
        experience BIGINT DEFAULT 0,
        
        -- Currency
        credits BIGINT DEFAULT 0,
        honor BIGINT DEFAULT 0,
        aetherium BIGINT DEFAULT 0,
        
        -- Ship State
        ship_type VARCHAR(50) DEFAULT 'Sparrow',
        current_health INT DEFAULT 4000,
        current_shield INT DEFAULT 0,
        
        -- Position
        last_x INT DEFAULT 1000,
        last_y INT DEFAULT 1000,
        
        -- Equipment (JSON for flexibility)
        equipment NVARCHAR(MAX) DEFAULT '{}',
        cargo NVARCHAR(MAX) DEFAULT '{}',
        ammo NVARCHAR(MAX) DEFAULT '{}',
        
        -- Registration tracking
        registration_ip VARCHAR(45),
        
        -- Timestamps
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);

    console.log('✅ Tables created successfully.');

    // Check for seed data
    const res = await pool.query('SELECT COUNT(*) as count FROM players');
    if (res.recordset[0].count === 0) {
      console.log('🌱 Seeding database...');
      await pool.query(`
        INSERT INTO players (username, credits, aetherium, experience)
        VALUES ('TestPilot', 1000, 100, 5000);
      `);
      console.log('✅ Seed data inserted.');
    } else {
      console.log('ℹ️ Database already contains data. Skipping seed.');
    }

  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('👋 Database connection closed.');
    }
  }
}

initDb();