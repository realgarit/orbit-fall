import { Server, Socket } from 'socket.io';
import { EntityManager } from './EntityManager.js';
import { AuthService } from './AuthService.js';
import { Pool } from 'pg';

export class SocketHandler {
  private io: Server;
  private entityManager: EntityManager;
  private authService: AuthService;
  private activeIps: Map<string, string> = new Map(); // ip -> socketId

  constructor(io: Server, entityManager: EntityManager, dbPool: Pool) {
    this.io = io;
    this.entityManager = entityManager;
    this.authService = new AuthService(dbPool);
  }

  handleConnection(socket: Socket) {
    console.log(`[SocketHandler] New connection: ${socket.id}`);

    // --- Event Listeners ---

    // 1. Register
    socket.on('register', async (data: { username: string; password: string }) => {
      const result = await this.authService.register(data.username, data.password);
      socket.emit('register_response', result);
    });

    // 2. Login
    socket.on('login', async (data: { username: string; password: string }) => {
      const ip = this.getClientIp(socket);
      const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';

      if (!isLocalhost && this.activeIps.has(ip)) {
        socket.emit('login_response', { success: false, message: 'Limit: 1 account per Public IP' });
        return;
      }

      const result = await this.authService.login(data.username, data.password);
      if (result.success) {
        // Add to game world
        this.entityManager.addPlayer(socket.id, result.user);
        this.activeIps.set(ip, socket.id);

        socket.emit('login_success', {
          id: socket.id,
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

    // 3. Player Input (Movement, Firing)
    socket.on('player_input', (data: any) => {
      this.entityManager.updatePlayerInput(socket.id, data);
    });

    // 4. Disconnect
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
