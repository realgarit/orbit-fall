import { useState } from 'react';
import { Game } from './components/Game';
import { LoginPage } from './components/LoginPage';
import { Socket } from 'socket.io-client';
import './App.css';

function App() {
  const [authState, setAuthState] = useState<{
    isLoggedIn: boolean;
    playerData: any;
    socket: Socket | null;
  }>({
    isLoggedIn: false,
    playerData: null,
    socket: null
  });

  const handleLoginSuccess = (data: any, socket: Socket) => {
    setAuthState({
      isLoggedIn: true,
      playerData: data,
      socket: socket
    });
  };

  if (!authState.isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <Game socket={authState.socket!} initialPlayerData={authState.playerData} />;
}

export default App;
