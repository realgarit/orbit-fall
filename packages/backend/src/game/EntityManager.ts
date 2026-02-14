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
  rotation: number;
  vx?: number;
  vy?: number;
  health?: number;
  maxHealth?: number;
  shield?: number;
  maxShield?: number;
  lastPatrolChange?: number;
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
        rotation: 0,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        health: 1000,
        maxHealth: 1000,
        shield: 600,
        maxShield: 600,
        lastPatrolChange: Date.now()
      });
    }
    for (let i = 1; i <= 15; i++) {
      const id = `ore-${i}`;
      this.ores.set(id, {
        id,
        type: Math.random() > 0.8 ? 'Beryl' : 'Pyrite',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        rotation: 0
      });
    }
    for (let i = 1; i <= 5; i++) {
      const id = `box-${i}`;
      this.boxes.set(id, {
        id,
        type: 'standard',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        rotation: 0
      });
    }
  }

  getPlayer(socketId: string) { return this.players.get(socketId); }

  addPlayer(socketId: string, dbUser: any): PlayerEntity {
    const username = dbUser.username || 'Unknown Pilot';
    const level = Number(dbUser.level ?? 1);
    const maxH = SPARROW_HITPOINTS + (level - 1) * 500;
    const maxS = (level - 1) * 250;
    
    const player: PlayerEntity = {
      id: socketId, socketId, dbId: dbUser.id, username,
      x: Number(dbUser.last_x ?? 1000), y: Number(dbUser.last_y ?? 1000),
      angle: 0, thrust: false, targetPosition: null, level,
      experience: Number(dbUser.experience ?? 0), credits: Number(dbUser.credits ?? 0),
      honor: Number(dbUser.honor ?? 0), aetherium: Number(dbUser.aetherium ?? 0),
      cargo: dbUser.cargo || {}, ammo: dbUser.ammo || {},
      health: Number(dbUser.current_health ?? maxH), maxHealth: maxH,
      shield: Number(dbUser.current_shield ?? maxS), maxShield: maxS,
      ship_type: dbUser.ship_type || 'Sparrow',
      lastInputTime: Date.now(), lastDamageTime: 0,
      speed: convertSpeed(320)
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
    const p = this.players.get(socketId);
    if (p) {
      p.experience += amount;
      const newLevel = Math.max(1, Math.floor(Math.log2(p.experience / 10000) + 2));
      if (newLevel > p.level) {
        p.level = newLevel;
        p.maxHealth = SPARROW_HITPOINTS + (newLevel - 1) * 500;
        p.maxShield = (newLevel - 1) * 250;
        p.health = p.maxHealth; p.shield = p.maxShield;
      }
    }
  }

  addCredits(socketId: string, amount: number) { const p = this.players.get(socketId); if (p) p.credits += amount; }
  addHonor(socketId: string, amount: number) { const p = this.players.get(socketId); if (p) p.honor += amount; }
  addAetherium(socketId: string, amount: number) { const p = this.players.get(socketId); if (p) p.aetherium += amount; }

  collectOre(socketId: string, oreId: string): boolean {
    const p = this.players.get(socketId);
    const ore = this.ores.get(oreId);
    if (p && ore) {
      p.cargo[ore.type] = (p.cargo[ore.type] || 0) + 1;
      this.ores.delete(oreId);
      setTimeout(() => {
        this.ores.set(oreId, { id: oreId, type: ore.type, x: Math.random() * MAP_WIDTH, y: Math.random() * MAP_HEIGHT, rotation: 0 });
      }, 30000);
      return true;
    }
    return false;
  }

  collectBox(socketId: string, boxId: string, reward: any): boolean {
    const p = this.players.get(socketId);
    if (p && this.boxes.has(boxId)) {
      if (reward.type === 'credits') p.credits += reward.amount;
      else if (reward.type === 'aetherium') p.aetherium += reward.amount;
      else if (reward.type === 'ammo') p.ammo[reward.ammoType] = (p.ammo[reward.ammoType] || 0) + reward.amount;
      
      this.boxes.delete(boxId);
      setTimeout(() => {
        this.boxes.set(boxId, { id: boxId, type: 'standard', x: Math.random() * MAP_WIDTH, y: Math.random() * MAP_HEIGHT, rotation: 0 });
      }, 15000);
      return true;
    }
    return false;
  }

  addAmmo(socketId: string, type: string, amount: number) {
    const p = this.players.get(socketId);
    if (p) p.ammo[type] = (p.ammo[type] || 0) + amount;
  }

  consumeAmmo(socketId: string, type: string): boolean {
    const p = this.players.get(socketId);
    if (p && (p.ammo[type] || 0) > 0) { p.ammo[type]--; return true; }
    return false;
  }

  updatePlayerInput(socketId: string, input: any) {
    const p = this.players.get(socketId);
    if (p) {
      p.lastInputTime = Date.now();
      if (input.thrust !== undefined) p.thrust = !!input.thrust;
      if (input.angle !== undefined && !isNaN(input.angle)) p.angle = Number(input.angle);
      if (input.targetPosition !== undefined) p.targetPosition = input.targetPosition;
    }
  }

  update(dt: number) {
    const now = Date.now();
    this.players.forEach(p => {
      let isMoving = false;
      let moveAngle = p.angle;
      if (p.targetPosition) {
        const dx = p.targetPosition.x - p.x; const dy = p.targetPosition.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) { isMoving = true; moveAngle = Math.atan2(dy, dx) + Math.PI/2; }
        else p.targetPosition = null;
      } else if (p.thrust) isMoving = true;

      if (isMoving) {
        p.x += Math.cos(moveAngle - Math.PI / 2) * p.speed * dt;
        p.y += Math.sin(moveAngle - Math.PI / 2) * p.speed * dt;
        p.x = Math.max(0, Math.min(MAP_WIDTH, p.x)); p.y = Math.max(0, Math.min(MAP_HEIGHT, p.y));
      }
      if (now - p.lastDamageTime > 5000 && p.shield < p.maxShield) {
        p.shield = Math.min(p.maxShield, p.shield + p.maxShield * 0.05 * dt);
      }
    });

    this.enemies.forEach(e => {
      if (now - (e.lastPatrolChange || 0) > 3000 + Math.random() * 2000) {
        const angle = Math.random() * Math.PI * 2;
        e.vx = Math.cos(angle) * 40; e.vy = Math.sin(angle) * 40;
        e.rotation = angle + Math.PI/2; // Sync rotation with movement
        e.lastPatrolChange = now;
      }
      e.x += (e.vx || 0) * dt; e.y += (e.vy || 0) * dt;
      e.x = Math.max(50, Math.min(MAP_WIDTH - 50, e.x));
      e.y = Math.max(50, Math.min(MAP_HEIGHT - 50, e.y));
    });
  }

  async savePlayerToDB(socketId: string) {
    const p = this.players.get(socketId);
    if (!p) return;
    try {
      await this.dbPool.query(
        `UPDATE players SET last_x = $1, last_y = $2, level = $3, experience = $4, credits = $5, honor = $6, aetherium = $7, cargo = $8, ammo = $9, current_health = $10, current_shield = $11, updated_at = NOW() WHERE id = $12`,
        [Math.round(p.x), Math.round(p.y), p.level, p.experience, p.credits, p.honor, p.aetherium, JSON.stringify(p.cargo), JSON.stringify(p.ammo), Math.round(p.health), Math.round(p.shield), p.dbId]
      );
    } catch (e) {}
  }

  async saveAllPlayers() { for (const id of this.players.keys()) await this.savePlayerToDB(id); }

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
