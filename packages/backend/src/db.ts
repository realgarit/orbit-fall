import mssql from 'mssql';

// Database configuration - use any to avoid type issues with mssql v10
const dbConfig: any = {
  server: process.env.DB_HOST || 'orbitfall-sql-server.database.windows.net',
  database: process.env.DB_NAME || 'orbitfall-db',
  user: process.env.DB_USER || 'orbitfalladmin',
  password: process.env.DB_PASSWORD || '',
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

// Override with DATABASE_URL if provided
const connectionString = process.env.DATABASE_URL;
if (connectionString) {
  dbConfig.connectionString = connectionString;
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Connecting to database: ${maskedUrl}`);
} else if (process.env.DB_HOST) {
  dbConfig.connectionString = `Server=${dbConfig.server};Database=${dbConfig.database};User Id=${dbConfig.user};Password=${dbConfig.password};Encrypt=true;TrustServerCertificate=false;`;
}

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
