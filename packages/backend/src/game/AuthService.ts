import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export class AuthService {
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  async register(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.dbPool.query('SELECT id FROM players WHERE username = $1', [username]);
      if (existingUser.rows.length > 0) {
        return { success: false, message: 'Username already exists' };
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      await this.dbPool.query(
        'INSERT INTO players (username, password_hash) VALUES ($1, $2)',
        [username, passwordHash]
      );

      return { success: true, message: 'Registration successful' };
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
