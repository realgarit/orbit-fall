import { Server } from 'socket.io';
import { EntityManager } from './EntityManager.js';

const TICK_RATE = 60; // 60 Hz
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const SAVE_INTERVAL_MS = 30000; // Save all players every 30 seconds

export class GameLoop {
  private io: Server;
  private entityManager: EntityManager;
  private intervalId: NodeJS.Timeout | null = null;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  start() {
    if (this.intervalId) return;

    console.log(`[GameLoop] Starting server tick at ${TICK_RATE} Hz`);
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);

    this.saveIntervalId = setInterval(() => {
      this.entityManager.saveAllPlayers();
    }, SAVE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
    console.log('[GameLoop] Stopped.');
  }

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    // 1. Update Game State
    this.entityManager.update(dt);

    // 2. AFK Checks
    this.checkAfk(now);

    // 3. Broadcast State
    const snapshot = this.entityManager.getSnapshot();
    this.io.emit('gameState', snapshot);
  }

  private async checkAfk(now: number) {
    const AFK_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    
    const playerIds = Array.from(this.entityManager.players.keys());

    for (const socketId of playerIds) {
      const player = this.entityManager.players.get(socketId);
      if (player && now - player.lastInputTime > AFK_TIMEOUT) {
        console.log(`[GameLoop] Kicking AFK player: ${player.username}`);

        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('error', { message: 'Disconnected due to inactivity.' });
          socket.disconnect(true);
        }
        // removePlayer already saves to DB
        await this.entityManager.removePlayer(socketId);
      }
    }
  }
}
