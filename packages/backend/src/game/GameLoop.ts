import { Server } from 'socket.io';
import { EntityManager } from './EntityManager.js';

const TICK_RATE = 60;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const SAVE_INTERVAL_MS = 30000;

export class GameLoop {
  private io: Server;
  private entityManager: EntityManager;
  private intervalId: NodeJS.Timeout | null = null;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private lastTickTime: [number, number] = process.hrtime();

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  start() {
    if (this.intervalId) return;

    console.log(`[GameLoop] Starting precision server tick at ${TICK_RATE} Hz`);
    this.lastTickTime = process.hrtime();
    
    // Core game tick
    this.intervalId = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);

    // Persistence tick
    this.saveIntervalId = setInterval(() => {
      this.entityManager.saveAllPlayers();
    }, SAVE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.saveIntervalId) clearInterval(this.saveIntervalId);
    this.intervalId = null;
    this.saveIntervalId = null;
    console.log('[GameLoop] Stopped.');
  }

  private tick() {
    // High-resolution delta time calculation
    const hrTime = process.hrtime(this.lastTickTime);
    const dt = hrTime[0] + hrTime[1] / 1e9; // Convert to seconds
    this.lastTickTime = process.hrtime();

    // 1. Update Game State (Movement, AI)
    if (dt > 0) {
      this.entityManager.update(dt);
    }

    // 2. AFK Checks
    this.checkAfk(Date.now());

    // 3. Broadcast Snapshot
    const snapshot = this.entityManager.getSnapshot();
    this.io.emit('gameState', snapshot);
  }

  private async checkAfk(now: number) {
    const AFK_TIMEOUT = 10 * 60 * 1000;
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
        await this.entityManager.removePlayer(socketId);
      }
    }
  }
}
