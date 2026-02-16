import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { EntityManager } from './game/EntityManager.js';
import { GameLoop } from './game/GameLoop.js';
import { SocketHandler } from './game/SocketHandler.js';

/**
 * Resolves a hostname to an IPv4 address.
 * This is useful on Render where IPv6 might be preferred by default but fails with ENETUNREACH.
 */
async function resolveToIPv4(hostname: string): Promise<string | null> {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return hostname;
  try {
    const { address } = await dns.promises.lookup(hostname, { family: 4 });
    return address;
  } catch (error) {
    return null;
  }
}

export function createApp(dbPool: Pool) {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173', // In production, same-origin is used
      methods: ['GET', 'POST'],
    },
  });

  // --- Game Infrastructure Setup ---
  const entityManager = new EntityManager(dbPool);
  const gameLoop = new GameLoop(io, entityManager);
  const socketHandler = new SocketHandler(io, entityManager, dbPool);

  // Start the Game Loop (60 Hz)
  gameLoop.start();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS for Express routes (API) - Allow dev or same-origin
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
    next();
  });

  // Serve static files from frontend
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    socketHandler.handleConnection(socket);
  });

  // Catch-all to serve frontend index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });

  return { app, server, io };
}

export async function createDatabasePool(): Promise<Pool> {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.warn('⚠️ No database connection string found (DATABASE_URL).');
  } else {
    // Log connection (safely)
    const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 Connecting to database: ${maskedUrl}`);
  }

  const pool = new Pool({
    connectionString: connectionString || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log(`✅ Database connected successfully`);
  } catch (err) {
    console.error(`❌ Database connection error:`, (err as Error).message);
    if ((err as Error).message.includes('getaddrinfo') || (err as Error).message.includes('connect ETIMEDOUT')) {
      console.error('💡 HINT: If you are on Render, ensure you are using the Supabase "Transaction Pooler" connection string (port 6543).');
    }
  }

  return pool;
}
