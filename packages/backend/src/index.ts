import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import 'dotenv/config';
import { createApp, createDatabasePool } from './server.js';

const PORT = process.env.PORT || 3000;

const { app, server } = createApp();
const dbPool = createDatabasePool();

// Store database pool in app for potential use in routes
(app as any).dbPool = dbPool;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    dbPool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    dbPool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

