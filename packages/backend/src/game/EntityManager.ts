import { Pool } from 'pg';
import { SPARROW_SHIP, MAP_WIDTH, MAP_HEIGHT, SPEED_SCALE_FACTOR } from '@orbit-fall/shared';

// Helper to convert base speed to game units per second
function convertSpeed(baseSpeed: number): number {
  // Frontend uses speed * delta (usually ~1 at 60fps)
  // To match that on the server with a dt in seconds, 
  // we need to scale the display speed.
  const displaySpeed = baseSpeed * SPEED_SCALE_FACTOR;
  return displaySpeed * 60; // scale to units per second
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
      angle: 0, // Default UP
      thrust: false,
      level: Number(dbUser.level ?? 1),
      experience: Number(dbUser.experience ?? 0),
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

  addExperience(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.experience = (player.experience || 0) + amount;
      // Formula: 10000 * 2^(x-2)
      const newLevel = Math.max(1, Math.floor(Math.log2(player.experience / 10000) + 2));
      if (newLevel > player.level) {
        player.level = newLevel;
        console.log(`[EntityManager] Player ${player.username} reached level ${newLevel}`);
      }
    }
  }

  addCredits(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.credits += amount;
    }
  }

  updatePlayerInput(socketId: string, input: { thrust?: boolean; angle?: number }) {
    const player = this.players.get(socketId);
    if (player) {
      player.lastInputTime = Date.now();
      if (input.thrust !== undefined) {
        player.thrust = !!input.thrust;
      }
      if (input.angle !== undefined && !isNaN(input.angle)) {
        player.angle = Number(input.angle);
      }
    }
  }

  update(dt: number) {
    // dt is in seconds
    this.players.forEach(player => {
      if (player.thrust) {
        // Correct vector: angle 0 is UP (-Y direction)
        // Cos(angle) is X, Sin(angle) is Y. 
        // Since 0 is UP, we subtract PI/2 from the mathematical 0 (which is RIGHT)
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
        'UPDATE players SET last_x = $1, last_y = $2, level = $3, experience = $4, credits = $5, updated_at = NOW() WHERE id = $6',
        [Math.round(player.x), Math.round(player.y), player.level, player.experience, player.credits, player.dbId]
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
        experience: p.experience,
        credits: p.credits,
        ship_type: p.ship_type
      })),
      enemies: Array.from(this.enemies.values()),
      timestamp: Date.now(),
    };
  }
}
