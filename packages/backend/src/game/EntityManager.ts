import { Pool } from 'pg';

// Hardcoded constants to prevent import-related NaN physics bugs
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const SPARROW_HITPOINTS = 4000;
const BASE_SPEED = 320;
const SCALE_FACTOR = 0.01;

function convertSpeed(baseSpeed: number): number {
  const displaySpeed = baseSpeed * SCALE_FACTOR;
  return displaySpeed * 60; // ~192 units per second
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
  targetPosition: { x: number; y: number } | null;
  
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
  ship_type: string;
  
  lastInputTime: number;
  lastDamageTime: number; 
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

  private calculateMaxHealth(level: number): number {
    return SPARROW_HITPOINTS + (level - 1) * 500;
  }

  private calculateMaxShield(level: number): number {
    return (level - 1) * 250;
  }

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
      targetPosition: null,
      level: level,
      experience: Number(dbUser.experience ?? 0),
      credits: Number(dbUser.credits ?? 0),
      honor: Number(dbUser.honor ?? 0),
      aetherium: Number(dbUser.aetherium ?? 0),
      health: this.calculateMaxHealth(level),
      maxHealth: this.calculateMaxHealth(level),
      shield: this.calculateMaxShield(level),
      maxShield: this.calculateMaxShield(level),
      ship_type: dbUser.ship_type || 'Sparrow',
      lastInputTime: Date.now(),
      lastDamageTime: 0,
      speed: convertSpeed(BASE_SPEED),
    };
    this.players.set(socketId, player);
    console.log(`[EntityManager] Player joined: ${username} at (${player.x}, ${player.y})`);
    return player;
  }

  async removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      await this.savePlayerToDB(socketId);
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
      const newLevel = Math.max(1, Math.floor(Math.log2(player.experience / 10000) + 2));
      if (newLevel > player.level) {
        player.level = newLevel;
        player.maxHealth = this.calculateMaxHealth(newLevel);
        player.maxShield = this.calculateMaxShield(newLevel);
        player.health = player.maxHealth;
        player.shield = player.maxShield;
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
      player.honor += (player.honor || 0) + amount;
    }
  }

  addAetherium(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.aetherium += (player.aetherium || 0) + amount;
    }
  }

  updatePlayerInput(socketId: string, input: { thrust?: boolean; angle?: number; targetPosition?: { x: number; y: number } | null }) {
    const player = this.players.get(socketId);
    if (player) {
      player.lastInputTime = Date.now();
      if (input.thrust !== undefined) player.thrust = !!input.thrust;
      if (input.angle !== undefined && !isNaN(input.angle)) player.angle = Number(input.angle);
      if (input.targetPosition !== undefined) player.targetPosition = input.targetPosition;
    }
  }

  update(dt: number) {
    const now = Date.now();
    this.players.forEach(player => {
      let isMoving = false;
      let moveAngle = player.angle;

      if (player.targetPosition) {
        const dx = player.targetPosition.x - player.x;
        const dy = player.targetPosition.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist > 5) {
          isMoving = true;
          moveAngle = Math.atan2(dy, dx) + Math.PI/2;
        } else {
          player.targetPosition = null;
        }
      } else if (player.thrust) {
        isMoving = true;
      }

      if (isMoving) {
        const vx = Math.cos(moveAngle - Math.PI / 2) * player.speed;
        const vy = Math.sin(moveAngle - Math.PI / 2) * player.speed;
        
        const oldX = player.x;
        const oldY = player.y;
        
        player.x += vx * dt;
        player.y += vy * dt;
        player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
        player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));

        // Log if movement is significant (for debugging desync)
        if (Math.abs(player.x - oldX) > 0.01) {
           // Movement confirmed in memory
        }
      }

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
        [Math.round(player.x), Math.round(player.y), player.level, player.experience, player.credits, player.honor, player.aetherium, player.dbId]
      );
    } catch (e) {}
  }

  async saveAllPlayers() {
    const savePromises = Array.from(this.players.keys()).map(id => this.savePlayerToDB(id));
    await Promise.all(savePromises);
  }

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
