import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

// Load environment variables - don't fail if .env is missing
import dotenv from 'dotenv';
// Try to load .env file if it exists, otherwise rely on environment variables
try {
  dotenv.config({ path: '.env' });
} catch (e) {
  // Ignore errors - we'll use environment variables from Azure
  console.log('Note: Using environment variables (no .env file found)');
}

import { createApp } from './server.js';
import { db } from './db.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Connect to database
  await db.connect();
  
  const { app, server } = createApp();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO server ready`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutdown signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      db.end().then(() => {
        console.log('Database connection closed');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
