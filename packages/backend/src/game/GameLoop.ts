import { Server } from 'socket.io';
import { EntityManager } from './EntityManager.js';

const TICK_RATE = 60;
const TICK_INTERVAL_MS = 1000 / TICK_RATE;

export class GameLoop {
  private io: Server;
  private entityManager: EntityManager;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  start() {
    if (this.intervalId) return; // Already running

    console.log(`[GameLoop] Starting server tick at ${TICK_RATE} Hz`);
    this.intervalId = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GameLoop] Stopped.');
    }
  }

  private tick() {
    const now = Date.now();

    // 1. Update Game State (Movement, AI, Collisions)
    // this.entityManager.update(TICK_INTERVAL_MS); 
    // (Jules will implement the update logic inside EntityManager)

    // 2. AFK Checks (Example: Disconnect after 10m)
    this.checkAfk(now);

    // 3. Broadcast State to Clients
    // We can optimize this to only send changed data later (Delta Compression)
    const snapshot = this.entityManager.getSnapshot();
    this.io.emit('gameState', snapshot);
  }

  private checkAfk(now: number) {
    // 10 minutes in ms
    const AFK_TIMEOUT = 10 * 60 * 1000; 
    
    this.entityManager.players.forEach((player, socketId) => {
      if (now - player.lastInputTime > AFK_TIMEOUT) {
        console.log(`[GameLoop] Kicking AFK player: ${player.username}`);
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('error', { message: 'Disconnected due to inactivity.' });
          socket.disconnect(true);
        }
        this.entityManager.removePlayer(socketId);
      }
    });
  }
}
