import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BACKUP_FILE = path.join(__dirname, '../backup.json');

async function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing');
  
  const config = {
    connectionString,
    options: {
      encrypt: true,
      trustServerCertificate: false
    }
  };
  return await sql.connect(connectionString);
}

async function exportData() {
  console.log('📥 Exporting data...');
  const pool = await getPool();
  
  try {
    const result = await pool.request().query('SELECT * FROM players');
    const players = result.recordset;
    fs.writeFileSync(BACKUP_FILE, JSON.stringify({ players }, null, 2));
    console.log(`✅ Success! ${players.length} players saved to ${BACKUP_FILE}`);
  } finally {
    await pool.close();
  }
}

async function importData() {
  if (!fs.existsSync(BACKUP_FILE)) throw new Error('No backup.json found to import');
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  
  console.log('📤 Importing data...');
  const pool = await getPool();
  
  try {
    for (const p of data.players) {
      const request = pool.request();
      const keys = Object.keys(p);
      const values = Object.values(p);
      
      // Build the UPSERT for MSSQL (MERGE or simple check)
      // For simplicity in this script, we'll do a DELETE and INSERT or just INSERT
      // Since it's a sync script, we'll use a simple MERGE-like approach
      
      let setClause = keys.map((k, i) => `target.[${k}] = source.[${k}]`).join(', ');
      let columns = keys.map(k => `[${k}]`).join(', ');
      let sourceColumns = keys.map(k => `@p${k}`).join(', ');

      keys.forEach((k, i) => {
        let val = p[k];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        request.input(`p${k}`, val);
      });

      const mergeSql = `
        MERGE INTO players AS target
        USING (SELECT ${keys.map(k => `@p${k} AS [${k}]`).join(', ')}) AS source
        ON (target.id = source.id)
        WHEN MATCHED THEN
          UPDATE SET ${setClause}, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (${columns}, updated_at) VALUES (${keys.map(k => `source.[${k}]`).join(', ')}, GETDATE());
      `;
      
      await request.query(mergeSql);
    }
    console.log(`✅ Success! ${data.players.length} players imported.`);
  } catch (e) {
    console.error('❌ Import failed:', e);
    throw e;
  } finally {
    await pool.close();
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
