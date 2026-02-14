import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

export function createApp() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS for Express routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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
    console.log(`User connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    // Example: Handle game events
    socket.on('player:move', (data) => {
      // Broadcast player movement to other clients
      socket.broadcast.emit('player:move', {
        id: socket.id,
        ...data,
      });
    });
  });

  // Catch-all to serve frontend index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });

  return { app, server, io };
}

export function createDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  // Parse host for logging, removing credentials
  const dbHost = connectionString.includes('@')
    ? connectionString.split('@')[1].split('/')[0]
    : connectionString.split('//')[1]?.split('/')[0] || 'unknown';

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error(`Database connection error [Host: ${dbHost}]:`, err.message);
      if ((err as any).code) console.error(`Error Code: ${(err as any).code}`);
      if ((err as any).address) console.error(`Address: ${(err as any).address}`);
    } else {
      console.log(`Database connected successfully to ${dbHost}`);
    }
  });

  return pool;
}
