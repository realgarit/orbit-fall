import { Server } from 'socket.io';
import { EntityManager } from './EntityManager.js';

const TICK_RATE = 30; 
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const SAVE_INTERVAL_MS = 30000;

export class GameLoop {
  private io: Server;
  private entityManager: EntityManager;
  private isRunning: boolean = false;
  private lastTickTime: [number, number] = process.hrtime();

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[GameLoop] Starting game engine at ${TICK_RATE} Hz`);
    this.lastTickTime = process.hrtime();
    this.run();
    this.startAutoSave();
  }

  private run() {
    if (!this.isRunning) return;
    const start = process.hrtime();
    this.tick();
    const end = process.hrtime(start);
    const elapsedMs = (end[0] * 1000) + (end[1] / 1e6);
    setTimeout(() => this.run(), Math.max(0, TICK_INTERVAL_MS - elapsedMs));
  }

  private startAutoSave() {
    setInterval(() => {
      this.entityManager.saveAllPlayers();
    }, SAVE_INTERVAL_MS);
  }

  stop() {
    this.isRunning = false;
    console.log('[GameLoop] Stopped.');
  }

  private tick() {
    const hrTime = process.hrtime(this.lastTickTime);
    const dt = hrTime[0] + hrTime[1] / 1e9;
    this.lastTickTime = process.hrtime();

    if (dt > 0) {
      this.entityManager.update(dt);
    }

    this.checkAfk(Date.now());

    const snapshot = this.entityManager.getSnapshot();
    this.io.emit('gameState', snapshot);
  }

  private async checkAfk(now: number) {
    const AFK_TIMEOUT = 10 * 60 * 1000;
    const playerIds = Array.from(this.entityManager.players.keys());
    for (const socketId of playerIds) {
      const player = this.entityManager.players.get(socketId);
      if (player && now - player.lastInputTime > AFK_TIMEOUT) {
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
