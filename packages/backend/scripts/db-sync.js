import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const BACKUP_FILE = path.join(__dirname, '../backup.json');

async function resolveToIPv4(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname;
  try {
    const { address } = await dns.promises.lookup(hostname, { family: 4 });
    return address;
  } catch (error) {
    return hostname;
  }
}

async function getClient(connectionString) {
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
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  return { pool, client: await pool.connect() };
}

async function exportData() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');
  
  console.log('📥 Exporting data...');
  const { pool, client } = await getClient(url);
  
  try {
    const players = (await client.query('SELECT * FROM players')).rows;
    fs.writeFileSync(BACKUP_FILE, JSON.stringify({ players }, null, 2));
    console.log(`✅ Success! ${players.length} players saved to ${BACKUP_FILE}`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function importData() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing');
  
  if (!fs.existsSync(BACKUP_FILE)) throw new Error('No backup.json found to import');
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  
  console.log('📤 Importing data...');
  const { pool, client } = await getClient(url);
  
  try {
    await client.query('BEGIN');
    for (const p of data.players) {
      const keys = Object.keys(p);
      const values = Object.values(p);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      
      await client.query(`
        INSERT INTO players (${columns}) VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET 
        username = EXCLUDED.username, 
        updated_at = NOW()
      `, values);
    }
    await client.query(`SELECT setval('players_id_seq', (SELECT MAX(id) FROM players))`);
    await client.query('COMMIT');
    console.log(`✅ Success! ${data.players.length} players imported.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

const mode = process.argv[2];
if (mode === '--export') exportData().catch(console.error);
else if (mode === '--import') importData().catch(console.error);
else {
  console.log('Usage:');
  console.log('  node db-sync.js --export  (DB -> backup.json)');
  console.log('  node db-sync.js --import  (backup.json -> DB)');
}
