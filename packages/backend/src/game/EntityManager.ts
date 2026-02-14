import { Socket } from 'socket.io';

// Placeholder interfaces - these should eventually match your shared types
interface PlayerEntity {
  id: string;
  socketId: string;
  x: number;
  y: number;
  username: string;
  lastInputTime: number; // For AFK detection
  // Add other stats here later (health, shield, etc.)
}

interface EnemyEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  // Add AI state here later
}

export class EntityManager {
  public players: Map<string, PlayerEntity> = new Map();
  public enemies: Map<string, EnemyEntity> = new Map();

  constructor() {
    // Initialize standard enemies or state here if needed
  }

  // --- Player Management ---

  addPlayer(socketId: string, username: string): PlayerEntity {
    const player: PlayerEntity = {
      id: socketId, // Simple ID for now
      socketId,
      x: 1000, // Default spawn
      y: 1000,
      username,
      lastInputTime: Date.now(),
    };
    this.players.set(socketId, player);
    console.log(`[EntityManager] Player added: ${username} (${socketId})`);
    return player;
  }

  removePlayer(socketId: string) {
    if (this.players.has(socketId)) {
      const player = this.players.get(socketId);
      console.log(`[EntityManager] Player removed: ${player?.username} (${socketId})`);
      this.players.delete(socketId);
    }
  }

  getPlayer(socketId: string) {
    return this.players.get(socketId);
  }

  updatePlayerInput(socketId: string, data: any) {
    const player = this.players.get(socketId);
    if (player) {
      player.lastInputTime = Date.now();
      // TODO: Validate and apply movement input here (Server Authority)
      // For now, we can just trust the client for the prototype phase,
      // OR store the input for the GameLoop to process.
    }
  }

  // --- State Export ---

  /**
   * Returns a snapshot of the world to send to clients
   */
  getSnapshot() {
    return {
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      timestamp: Date.now(),
    };
  }
}
