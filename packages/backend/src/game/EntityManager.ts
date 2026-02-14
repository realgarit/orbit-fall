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
  
  // Progression
  level: number;
  experience: number;
  credits: number;
  honor: number;
  aetherium: number;
  
  // Combat Stats (Authoritative)
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  
  lastInputTime: number;
  lastDamageTime: number; // For shield regeneration
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

  // --- Stat Calculation (The Engine) ---

  private calculateMaxHealth(level: number): number {
    return SPARROW_SHIP.hitpoints + (level - 1) * 500;
  }

  private calculateMaxShield(level: number): number {
    return (level - 1) * 250;
  }

  // --- Player Management ---

  addPlayer(socketId: string, dbUser: any): PlayerEntity {
    const username = dbUser.username || 'Unknown Pilot';
    const level = Number(dbUser.level ?? 1);
    
    const player: PlayerEntity = {
      id: socketId,
      socketId,
      dbId: dbUser.id,
      username: username,
      x: Number(dbUser.last_x ?? 1000),
      y: Number(dbUser.last_y ?? 1000),
      angle: 0,
      thrust: false,
      
      // Progression (from DB)
      level: level,
      experience: Number(dbUser.experience ?? 0),
      credits: Number(dbUser.credits ?? 0),
      honor: Number(dbUser.honor ?? 0),
      aetherium: Number(dbUser.aetherium ?? 0),
      
      // Combat Stats (Calculated)
      health: this.calculateMaxHealth(level), // Initialized to full
      maxHealth: this.calculateMaxHealth(level),
      shield: this.calculateMaxShield(level),
      maxShield: this.calculateMaxShield(level),
      
      lastInputTime: Date.now(),
      lastDamageTime: 0,
      speed: convertSpeed(SPARROW_SHIP.baseSpeed),
    };
    this.players.set(socketId, player);
    console.log(`[EntityManager] Player joined: ${username} (Lvl ${level})`);
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
      player.experience += amount;
      // Formula: 10000 * 2^(x-2)
      const newLevel = Math.max(1, Math.floor(Math.log2(player.experience / 10000) + 2));
      if (newLevel > player.level) {
        player.level = newLevel;
        // Recalculate max stats on level up
        player.maxHealth = this.calculateMaxHealth(newLevel);
        player.maxShield = this.calculateMaxShield(newLevel);
        // Heal on level up
        player.health = player.maxHealth;
        player.shield = player.maxShield;
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

  addHonor(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.honor += amount;
    }
  }

  addAetherium(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.aetherium += amount;
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
    const now = Date.now();
    this.players.forEach(player => {
      // 1. Movement
      if (player.thrust) {
        const vx = Math.cos(player.angle - Math.PI / 2) * player.speed;
        const vy = Math.sin(player.angle - Math.PI / 2) * player.speed;
        player.x += vx * dt;
        player.y += vy * dt;
        player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
        player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));
      }

      // 2. Shield Regeneration (e.g., 5% per second after 5s of no damage)
      if (now - player.lastDamageTime > 5000 && player.shield < player.maxShield) {
        const regenAmount = player.maxShield * 0.05 * dt;
        player.shield = Math.min(player.maxShield, player.shield + regenAmount);
      }
    });
  }

  async savePlayerToDB(socketId: string) {
    const player = this.players.get(socketId);
    if (!player) return;

    try {
      await this.dbPool.query(
        'UPDATE players SET last_x = $1, last_y = $2, level = $3, experience = $4, credits = $5, honor = $6, aetherium = $7, updated_at = NOW() WHERE id = $8',
        [
          Math.round(player.x), 
          Math.round(player.y), 
          player.level, 
          player.experience, 
          player.credits, 
          player.honor, 
          player.aetherium, 
          player.dbId
        ]
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
        
        // Authoritative Stats
        level: p.level,
        experience: p.experience,
        credits: p.credits,
        honor: p.honor,
        aetherium: p.aetherium,
        health: p.health,
        maxHealth: p.maxHealth,
        shield: p.shield,
        maxShield: p.maxShield,
        
        ship_type: p.ship_type
      })),
      enemies: Array.from(this.enemies.values()),
      timestamp: Date.now(),
    };
  }
}
