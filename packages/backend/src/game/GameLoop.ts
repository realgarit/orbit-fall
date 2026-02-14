import { Server } from 'socket.io';
import { EntityManager } from './EntityManager.js';

const TICK_RATE = 20; // Reduced to 20Hz for free-tier stability
const TICK_INTERVAL_MS = 1000 / TICK_RATE;
const SAVE_INTERVAL_MS = 30000;

export class GameLoop {
  private io: Server;
  private entityManager: EntityManager;
  private isRunning: boolean = false;
  private lastTickTime: [number, number] = process.hrtime();
  private lastLogTime: number = Date.now();

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[GameLoop] Starting resilient server tick at ${TICK_RATE} Hz`);
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

    // Schedule next tick, accounting for the time this tick took
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

    // 1. Update Game State
    if (dt > 0) {
      this.entityManager.update(dt);
    }

    // 2. Diagnostic Logging (Every 5 seconds)
    const now = Date.now();
    if (now - this.lastLogTime > 5000) {
      this.lastLogTime = now;
      this.entityManager.players.forEach(p => {
        console.log(`[GameLoop] Diagnostics: ${p.username} at (${Math.round(p.x)}, ${Math.round(p.y)}) | Thrust: ${p.thrust} | Target: ${!!p.targetPosition}`);
      });
    }

    // 3. AFK Checks
    this.checkAfk(now);

    // 4. Broadcast Snapshot
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
