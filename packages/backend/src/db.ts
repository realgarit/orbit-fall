import mssql from 'mssql';

// Database configuration - all values must be provided by Azure environment variables
// No defaults - the app should fail fast if environment variables are missing
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// Validate required environment variables at startup
const requiredVars = [
  { name: 'DB_HOST', value: DB_HOST },
  { name: 'DB_NAME', value: DB_NAME },
  { name: 'DB_USER', value: DB_USER },
  { name: 'DB_PASSWORD', value: DB_PASSWORD }
];

console.log('📋 Database environment configuration:');
requiredVars.forEach(({ name, value }) => {
  const isSet = value !== undefined && value !== null;
  console.log(`  ${name}: ${isSet ? (name === 'DB_PASSWORD' ? '***(set)' : value) : '❌ NOT SET'}`);
});

// Check for missing required variables
const missingVars = requiredVars
  .filter(({ value }) => value === undefined || value === null)
  .map(({ name }) => name);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('   These must be provided by Azure App Service configuration.');
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Database configuration for mssql
const dbConfig: any = {
  server: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Build connection string for logging and verify config
// Azure SQL requires 'User Id' (with space) in connection string
const connectionString = `Server=${DB_HOST};Database=${DB_NAME};User Id=${DB_USER};Password=${DB_PASSWORD};Encrypt=true;TrustServerCertificate=false;`;
dbConfig.connectionString = connectionString;

// Log connection info (mask password)
const maskedConnectionString = connectionString.replace(/Password=[^;]+/, 'Password=****');
console.log(`🔌 Connecting to database: ${maskedConnectionString}`);

// Create a simple wrapper that provides pg-like API
class Database {
  private pool: any = null;

  async connect(): Promise<void> {
    try {
      this.pool = await mssql.connect(dbConfig);
      await this.pool.query('SELECT 1');
      console.log('✅ Database connected successfully');
    } catch (err) {
      console.error('❌ Database connection error:', (err as Error).message);
      throw err;
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.pool) throw new Error('Database not connected');
    
    const request = this.pool.request();
    
    // Convert PostgreSQL $1, $2 params to SQL Server @p1, @p2
    if (params && params.length > 0) {
      params.forEach((param, index) => {
        request.input(`p${index + 1}`, param);
      });
      
      // Replace $1, $2, etc. with @p1, @p2
      let mssqlQuery = sql;
      let paramIndex = 1;
      mssqlQuery = mssqlQuery.replace(/\$(\d+)/g, () => {
        return `@p${paramIndex++}`;
      });
      
      const result = await request.query(mssqlQuery);
      return result.recordset;
    }
    
    // Handle NOW() function
    const mssqlQuery = sql.replace(/NOW\(\)/g, 'GETDATE()');
    const result = await request.query(mssqlQuery);
    return result.recordset;
  }

  async end(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  getPool(): any {
    return this.pool;
  }
}

// Export a singleton instance
export const db = new Database();

// Export for type compatibility with existing code
export type Pool = any;
