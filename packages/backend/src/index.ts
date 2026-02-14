import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import 'dotenv/config';
import { createApp, createDatabasePool } from './server.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  const dbPool = await createDatabasePool();
  const { app, server } = createApp(dbPool);

  // Store database pool in app for potential use in routes
  (app as any).dbPool = dbPool;

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO server ready`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutdown signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      dbPool.end(() => {
        console.log('Database pool closed');
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
