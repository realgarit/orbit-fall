import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export class AuthService {
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  async register(username: string, password: string, ip: string): Promise<{ success: boolean; message: string }> {
    if (!username || username.trim().length === 0) {
      return { success: false, message: 'Username cannot be empty' };
    }
    if (!password || password.trim().length === 0) {
      return { success: false, message: 'Password cannot be empty' };
    }

    try {
      const client = await this.dbPool.connect();
      try {
        // 1. Check IP limit (Skip for localhost)
        const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
        if (!isLocalhost) {
          const ipCheck = await client.query('SELECT COUNT(*) FROM players WHERE registration_ip = $1', [ip]);
          if (parseInt(ipCheck.rows[0].count) >= 1) {
            return { success: false, message: 'Registration Limit: 1 account per Public IP' };
          }
        }

        // 2. Check if user already exists
        const existingUser = await client.query('SELECT id FROM players WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
          return { success: false, message: 'Username already exists' };
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await client.query(
          'INSERT INTO players (username, password_hash, registration_ip) VALUES ($1, $2, $3)',
          [username, passwordHash, ip]
        );

        return { success: true, message: 'Registration successful' };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const result = await this.dbPool.query('SELECT * FROM players WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid username or password' };
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);

      if (!match) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Don't send the password hash back
      const { password_hash, ...safeUser } = user;
      return { success: true, message: 'Login successful', user: safeUser };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  }
}
