import { Pool } from 'pg';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
const SPARROW_HITPOINTS = 4000;
const BASE_SPEED = 320;
const SCALE_FACTOR = 0.01;

function convertSpeed(baseSpeed: number): number {
  const displaySpeed = baseSpeed * SCALE_FACTOR;
  return displaySpeed * 60; 
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
  level: number;
  experience: number;
  credits: number;
  honor: number;
  aetherium: number;
  cargo: Record<string, number>;
  ammo: Record<string, number>;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  ship_type: string;
  lastInputTime: number;
  lastDamageTime: number; 
  speed: number;
}

interface WorldEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  health?: number;
  maxHealth?: number;
  shield?: number;
  maxShield?: number;
}

export class EntityManager {
  public players: Map<string, PlayerEntity> = new Map();
  public enemies: Map<string, WorldEntity> = new Map();
  public ores: Map<string, WorldEntity> = new Map();
  public boxes: Map<string, WorldEntity> = new Map();
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.initializeWorld();
  }

  private initializeWorld() {
    for (let i = 1; i <= 5; i++) {
      this.enemies.set(`enemy-${i}`, {
        id: `enemy-${i}`,
        type: 'DRIFTER',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        health: 1000,
        maxHealth: 1000,
        shield: 600,
        maxShield: 600
      });
    }
    for (let i = 1; i <= 20; i++) {
      this.ores.set(`ore-${i}`, {
        id: `ore-${i}`,
        type: Math.random() > 0.8 ? 'Beryl' : 'Pyrite',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT
      });
    }
    for (let i = 1; i <= 5; i++) {
      this.boxes.set(`box-${i}`, {
        id: `box-${i}`,
        type: 'standard',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT
      });
    }
  }

  private calculateMaxHealth(level: number): number {
    return SPARROW_HITPOINTS + (level - 1) * 500;
  }

  private calculateMaxShield(level: number): number {
    return (level - 1) * 250;
  }

  getPlayer(socketId: string) {
    return this.players.get(socketId);
  }

  addPlayer(socketId: string, dbUser: any): PlayerEntity {
    const username = dbUser.username || 'Unknown Pilot';
    const level = Number(dbUser.level ?? 1);
    const maxH = this.calculateMaxHealth(level);
    const maxS = this.calculateMaxShield(level);
    
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
      cargo: dbUser.cargo || {},
      ammo: dbUser.ammo || {},
      health: Number(dbUser.current_health ?? maxH),
      maxHealth: maxH,
      shield: Number(dbUser.current_shield ?? maxS),
      maxShield: maxS,
      ship_type: dbUser.ship_type || 'Sparrow',
      lastInputTime: Date.now(),
      lastDamageTime: 0,
      speed: convertSpeed(BASE_SPEED),
    };
    this.players.set(socketId, player);
    return player;
  }

  async removePlayer(socketId: string) {
    const player = this.players.get(socketId);
    if (player) {
      await this.savePlayerToDB(socketId);
      this.players.delete(socketId);
    }
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
    if (player) player.credits += amount;
  }

  addHonor(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) player.honor += amount;
  }

  addAetherium(socketId: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) player.aetherium += amount;
  }

  addCargo(socketId: string, type: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) {
      player.cargo[type] = (player.cargo[type] || 0) + amount;
      for (const [id, ore] of this.ores.entries()) {
        if (ore.type === type) {
          this.ores.delete(id);
          setTimeout(() => {
            this.ores.set(id, { id, type, x: Math.random() * MAP_WIDTH, y: Math.random() * MAP_HEIGHT });
          }, 30000);
          break;
        }
      }
    }
  }

  removeBox(boxId: string) {
    this.boxes.delete(boxId);
    setTimeout(() => {
      this.boxes.set(boxId, { id: boxId, type: 'standard', x: Math.random() * MAP_WIDTH, y: Math.random() * MAP_HEIGHT });
    }, 10000);
  }

  addAmmo(socketId: string, type: string, amount: number) {
    const player = this.players.get(socketId);
    if (player) player.ammo[type] = (player.ammo[type] || 0) + amount;
  }

  consumeAmmo(socketId: string, type: string): boolean {
    const player = this.players.get(socketId);
    if (player && (player.ammo[type] || 0) > 0) {
      player.ammo[type]--;
      return true;
    }
    return false;
  }

  updatePlayerInput(socketId: string, input: any) {
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
        player.x += Math.cos(moveAngle - Math.PI / 2) * player.speed * dt;
        player.y += Math.sin(moveAngle - Math.PI / 2) * player.speed * dt;
        player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
        player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));
      }
      if (now - player.lastDamageTime > 5000 && player.shield < player.maxShield) {
        const regenAmount = player.maxShield * 0.05 * dt;
        player.shield = Math.min(player.maxShield, player.shield + regenAmount);
      }
    });
  }

  async savePlayerToDB(socketId: string) {
    const p = this.players.get(socketId);
    if (!p) return;
    try {
      await this.dbPool.query(
        `UPDATE players SET 
          last_x = $1, last_y = $2, level = $3, experience = $4, 
          credits = $5, honor = $6, aetherium = $7, cargo = $8, 
          ammo = $9, current_health = $10, current_shield = $11, 
          updated_at = NOW() WHERE id = $12`,
        [Math.round(p.x), Math.round(p.y), p.level, p.experience, p.credits, p.honor, p.aetherium, JSON.stringify(p.cargo), JSON.stringify(p.ammo), Math.round(p.health), Math.round(p.shield), p.dbId]
      );
    } catch (e) {}
  }

  async saveAllPlayers() {
    for (const id of this.players.keys()) await this.savePlayerToDB(id);
  }

  getSnapshot() {
    return {
      players: Array.from(this.players.values()).map(p => ({
        id: p.id, username: p.username, x: p.x, y: p.y, angle: p.angle, thrust: p.thrust,
        level: p.level, experience: p.experience, credits: p.credits, honor: p.honor, 
        aetherium: p.aetherium, cargo: p.cargo, ammo: p.ammo, health: p.health, 
        maxHealth: p.maxHealth, shield: p.shield, maxShield: p.maxShield, ship_type: p.ship_type
      })),
      enemies: Array.from(this.enemies.values()),
      ores: Array.from(this.ores.values()),
      boxes: Array.from(this.boxes.values()),
      timestamp: Date.now(),
    };
  }
}
