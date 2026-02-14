import { Server, Socket } from 'socket.io';
import { EntityManager } from './EntityManager.js';

export class SocketHandler {
  private io: Server;
  private entityManager: EntityManager;

  constructor(io: Server, entityManager: EntityManager) {
    this.io = io;
    this.entityManager = entityManager;
  }

  handleConnection(socket: Socket) {
    console.log(`[SocketHandler] New connection: ${socket.id}`);

    // --- Event Listeners ---

    // 1. Login / Join
    socket.on('join_game', (data: { username: string }) => {
      // Basic validation
      const username = data.username || `Pilot-${socket.id.substr(0, 4)}`;
      
      // Add to game world
      this.entityManager.addPlayer(socket.id, username);
      
      // Confirm join
      socket.emit('join_success', { id: socket.id, x: 1000, y: 1000 });
    });

    // 2. Player Input (Movement, Firing)
    socket.on('player_input', (data: any) => {
      // Jules will expand this to handle { thrust, angle, fire }
      this.entityManager.updatePlayerInput(socket.id, data);
    });

    // 3. Disconnect
    socket.on('disconnect', () => {
      console.log(`[SocketHandler] Disconnect: ${socket.id}`);
      this.entityManager.removePlayer(socket.id);
    });
  }
}
