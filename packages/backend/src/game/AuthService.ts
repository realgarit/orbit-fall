import { db } from '../db.js';
import bcrypt from 'bcrypt';

export class AuthService {
  async register(username: string, password: string, ip: string): Promise<{ success: boolean; message: string }> {
    if (!username || username.trim().length === 0) {
      return { success: false, message: 'Username cannot be empty' };
    }
    if (!password || password.trim().length === 0) {
      return { success: false, message: 'Password cannot be empty' };
    }

    try {
      // 1. Check IP limit (Skip for localhost)
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
      if (!isLocalhost) {
        const ipCheck = await db.query('SELECT COUNT(*) as count FROM players WHERE registration_ip = @p1', [ip]);
        if (ipCheck.length > 0 && ipCheck[0].count >= 1) {
          return { success: false, message: 'Registration failed. Please contact the administrator.' };
        }
      }

      // 2. Check if user already exists
      const existingUser = await db.query('SELECT id FROM players WHERE username = @p1', [username]);
      if (existingUser.length > 0) {
        return { success: false, message: 'Username already exists' };
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      await db.query(
        'INSERT INTO players (username, password_hash, registration_ip) VALUES (@p1, @p2, @p3)',
        [username, passwordHash, ip]
      );

      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const result = await db.query('SELECT * FROM players WHERE username = @p1', [username]);
      if (result.length === 0) {
        return { success: false, message: 'Invalid username or password' };
      }

      const user = result[0];
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
