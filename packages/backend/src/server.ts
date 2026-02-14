import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

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

export async function createDatabasePool(): Promise<Pool> {
  let connectionString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

  // Parse host for logging, removing credentials
  const dbHostMatch = connectionString.match(/@([^/]+)/) || connectionString.match(/\/\/([^/]+)/);
  let dbHost = dbHostMatch ? dbHostMatch[1] : 'unknown';

  // Extract hostname and port
  const [hostname, port] = dbHost.split(':');

  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const ipv4 = await resolveToIPv4(hostname);
    if (ipv4) {
      if (ipv4 !== hostname) {
        console.log(`Resolved database host ${hostname} to IPv4: ${ipv4}`);
        // Replace hostname with IP in connection string
        connectionString = connectionString.replace(hostname, ipv4);
      }
    } else {
      // IPv4 resolution failed. Check if it's a Supabase direct host.
      const supabaseMatch = hostname.match(/db\.([^.]+)\.supabase\.co/);
      if (supabaseMatch) {
        const projectRef = supabaseMatch[1];
        const poolerHost = `aws-0-eu-west-1.pooler.supabase.com`;
        console.warn(`IPv4 resolution failed for Supabase direct host ${hostname}.`);
        console.log(`Falling back to Supabase Connection Pooler: ${poolerHost}`);

        // Transform connection string: replace host and update user
        connectionString = connectionString.replace(hostname, poolerHost);
        // Username needs to be postgres.[projectRef]
        if (!connectionString.includes(`postgres.${projectRef}`)) {
          connectionString = connectionString.replace("://postgres:", `://postgres.${projectRef}:`);
        }
        dbHost = `${poolerHost} (Fallback from ${hostname})`;
      } else {
        console.warn(`IPv4 resolution failed for ${hostname}, falling back to original hostname.`);
      }
    }
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log(`Database connected successfully to ${dbHost}`);
  } catch (err) {
    console.error(`Database connection error [Host: ${dbHost}]:`, (err as Error).message);
    if ((err as any).code) console.error(`Error Code: ${(err as any).code}`);
    if ((err as any).address) console.error(`Address: ${(err as any).address}`);
  }

  return pool;
}
