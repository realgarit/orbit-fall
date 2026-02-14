import { Server, Socket } from 'socket.io';
import { EntityManager } from './EntityManager.js';
import { AuthService } from './AuthService.js';
import { Pool } from 'pg';
import { ENEMY_STATS } from '@orbit-fall/shared';

export class SocketHandler {
  private io: Server;
  private entityManager: EntityManager;
  private authService: AuthService;
  private dbPool: Pool;
  private activeIps: Map<string, string> = new Map(); // ip -> socketId

  constructor(io: Server, entityManager: EntityManager, dbPool: Pool) {
    this.io = io;
    this.entityManager = entityManager;
    this.dbPool = dbPool;
    this.authService = new AuthService(dbPool);
  }

  handleConnection(socket: Socket) {
    console.log(`[SocketHandler] New connection: ${socket.id}`);

    // --- Event Listeners ---

    // 1. Register
    socket.on('register', async (data: { username: string; password: string }) => {
      const ip = this.getClientIp(socket);
      console.log(`[SocketHandler] Registration attempt for ${data.username} from IP: ${ip}`);
      const result = await this.authService.register(data.username, data.password, ip);
      socket.emit('register_response', result);
    });

    // 2. Login
    socket.on('login', async (data: { username: string; password: string }) => {
      const ip = this.getClientIp(socket);
      const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');

      console.log(`[SocketHandler] Login attempt for ${data.username} from IP: ${ip}`);

      // Concurrent Session Limit
      if (!isLocalhost && this.activeIps.has(ip)) {
        console.warn(`[SocketHandler] Denied login for ${data.username}: IP ${ip} already active.`);
        socket.emit('login_response', { success: false, message: 'Login Limit: 1 active session per Public IP' });
        return;
      }

      const result = await this.authService.login(data.username, data.password);
      if (result.success) {
        // Add to game world
        this.entityManager.addPlayer(socket.id, result.user);
        this.activeIps.set(ip, socket.id);

        // Create a simple session token
        const sessionToken = Buffer.from(`${result.user.username}:${Date.now()}`).toString('base64');

        socket.emit('login_success', {
          id: socket.id,
          sessionToken,
          username: result.user.username,
          x: result.user.last_x,
          y: result.user.last_y,
          level: result.user.level,
          credits: result.user.credits,
          ship_type: result.user.ship_type
        });
      } else {
        socket.emit('login_response', result);
      }
    });

    // 2.5 Reconnect / Token Login
    socket.on('resume_session', async (data: { token: string; username: string }) => {
      const ip = this.getClientIp(socket);
      // For prototype, we just trust the token if the username matches
      const result = await this.dbPool.query('SELECT * FROM players WHERE username = $1', [data.username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        this.entityManager.addPlayer(socket.id, user);
        this.activeIps.set(ip, socket.id);
        socket.emit('login_success', {
          id: socket.id,
          username: user.username,
          x: user.last_x,
          y: user.last_y,
          level: user.level,
          credits: user.credits,
          ship_type: user.ship_type
        });
      }
    });

    // 3. Player Input (Movement, Firing)
    socket.on('player_input', (data: any) => {
      this.entityManager.updatePlayerInput(socket.id, data);
    });

    // 4. Rewards Authority
    socket.on('enemy_destroyed', (data: { type: string }) => {
      const reward = ENEMY_STATS.DRIFTER.REWARD;
      this.entityManager.addExperience(socket.id, reward.experience);
      this.entityManager.addCredits(socket.id, reward.credits);
      this.entityManager.addHonor(socket.id, reward.honor);
      this.entityManager.addAetherium(socket.id, reward.aetherium);
      this.entityManager.savePlayerToDB(socket.id);
    });

    socket.on('collect_ore', (data: { type: string }) => {
      this.entityManager.addCargo(socket.id, data.type, 1);
      this.entityManager.savePlayerToDB(socket.id);
    });

    socket.on('collect_bonus_box', (data: { type: string; reward: any }) => {
      if (data.reward.type === 'credits') {
        this.entityManager.addCredits(socket.id, data.reward.amount);
      } else if (data.reward.type === 'aetherium') {
        this.entityManager.addAetherium(socket.id, data.reward.amount);
      } else if (data.reward.type === 'ammo') {
        this.entityManager.addAmmo(socket.id, data.reward.ammoType, data.reward.amount);
      }
      this.entityManager.savePlayerToDB(socket.id);
    });

    socket.on('fire_laser', (data: { ammoType: string }) => {
      if (this.entityManager.consumeAmmo(socket.id, data.ammoType)) {
        this.entityManager.savePlayerToDB(socket.id);
      }
    });

    socket.on('fire_rocket', (data: { rocketType: string }) => {
      if (this.entityManager.consumeAmmo(socket.id, data.rocketType)) {
        this.entityManager.savePlayerToDB(socket.id);
      }
    });

    // 5. Disconnect
    socket.on('disconnect', () => {
      console.log(`[SocketHandler] Disconnect: ${socket.id}`);
      const ip = this.getClientIp(socket);
      if (this.activeIps.get(ip) === socket.id) {
        this.activeIps.delete(ip);
      }
      this.entityManager.removePlayer(socket.id).catch(err => console.error("Error removing player:", err));
    });
  }

  private getClientIp(socket: Socket): string {
    return (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0] || socket.handshake.address;
  }
}
