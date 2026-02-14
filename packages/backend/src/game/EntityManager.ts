import { Pool } from 'pg';
import { SPARROW_SHIP, MAP_WIDTH, MAP_HEIGHT, SPEED_SCALE_FACTOR } from '@orbit-fall/shared';

// Helper to convert base speed to game units per second
function convertSpeed(baseSpeed: number): number {
  return baseSpeed * SPEED_SCALE_FACTOR * 60; // scale to pixels per second (assuming 60fps base)
}

interface PlayerEntity {
  id: string;
  socketId: string;
  dbId: number;
  username: string;
  x: number;
  y: number;
  angle: number;
  thrust: boolean;
  level: number;
  credits: number;
  ship_type: string;
  lastInputTime: number;
  speed: number;
}

interface EnemyEntity {
  id: string;
  type: string;
  x: number;
  y: number;
}

export class EntityManager {
  public players: Map<string, PlayerEntity> = new Map();
  public enemies: Map<string, EnemyEntity> = new Map();
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
  }

  // --- Player Management ---

  addPlayer(socketId: string, dbUser: any): PlayerEntity {
    const username = dbUser.username || 'Unknown Pilot';
    const player: PlayerEntity = {
      id: socketId,
      socketId,
      dbId: dbUser.id,
      username: username,
      x: Number(dbUser.last_x ?? 1000),
      y: Number(dbUser.last_y ?? 1000),
      angle: 0,
      thrust: false,
      level: dbUser.level ?? 1,
      credits: Number(dbUser.credits ?? 0),
      ship_type: dbUser.ship_type ?? 'Sparrow',
      lastInputTime: Date.now(),
      speed: convertSpeed(SPARROW_SHIP.baseSpeed),
    };
    this.players.set(socketId, player);
    console.log(`[EntityManager] Player joined: ${username} (${socketId})`);
    return player;
  }

  async removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      await this.savePlayerToDB(socketId);
      console.log(`[EntityManager] Player removed & saved: ${player.username}`);
      this.players.delete(socketId);
    }
  }

  getPlayer(socketId: string) {
    return this.players.get(socketId);
  }

  updatePlayerInput(socketId: string, input: { thrust?: boolean; angle?: number }) {
    const player = this.players.get(socketId);
    if (player) {
      player.lastInputTime = Date.now();
      if (input.thrust !== undefined) player.thrust = input.thrust;
      if (input.angle !== undefined) player.angle = input.angle;
    }
  }

  update(dt: number) {
    // dt is in seconds
    this.players.forEach(player => {
      if (player.thrust) {
        // Ship faces UP at 0 radians, so we subtract PI/2 to align with PIXI coordinate system
        const vx = Math.cos(player.angle - Math.PI / 2) * player.speed;
        const vy = Math.sin(player.angle - Math.PI / 2) * player.speed;

        player.x += vx * dt;
        player.y += vy * dt;

        // Map boundaries
        player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
        player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));
      }
    });
  }

  async savePlayerToDB(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;

    try {
      await this.dbPool.query(
        'UPDATE players SET last_x = $1, last_y = $2, level = $3, credits = $4, updated_at = NOW() WHERE id = $5',
        [Math.round(player.x), Math.round(player.y), player.level, player.credits, player.dbId]
      );
    } catch (error) {
      console.error(`[EntityManager] Error saving player ${player.username}:`, error);
    }
  }

  async saveAllPlayers() {
    const savePromises = Array.from(this.players.keys()).map(socketId => this.savePlayerToDB(socketId));
    await Promise.all(savePromises);
  }

  // --- State Export ---

  getSnapshot() {
    return {
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        x: p.x,
        y: p.y,
        angle: p.angle,
        thrust: p.thrust,
        level: p.level,
        ship_type: p.ship_type
      })),
      enemies: Array.from(this.enemies.values()),
      timestamp: Date.now(),
    };
  }
}
