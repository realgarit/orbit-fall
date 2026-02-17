import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { EntityManager } from './game/EntityManager.js';
import { GameLoop } from './game/GameLoop.js';
import { SocketHandler } from './game/SocketHandler.js';
import { db } from './db.js';

export function createApp() {
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
  const entityManager = new EntityManager();
  const gameLoop = new GameLoop(io, entityManager);
  const socketHandler = new SocketHandler(io, entityManager);

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


