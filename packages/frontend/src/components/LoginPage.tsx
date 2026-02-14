import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface LoginPageProps {
  onLoginSuccess: (data: any, socket: Socket) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('login_response', (data) => {
      setLoading(false);
      if (data.success) {
        // This will be handled by login_success for game data
      } else {
        setError(data.message);
      }
    });

    newSocket.on('login_success', (data) => {
      setLoading(false);
      onLoginSuccess(data, newSocket);
    });

    newSocket.on('register_response', (data) => {
      setLoading(false);
      if (data.success) {
        setError('Registration successful! You can now log in.');
      } else {
        setError(data.message);
      }
    });

    return () => {
      // Don't disconnect here if we're moving to the game
    };
  }, [onLoginSuccess]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    setError('');
    setLoading(true);
    socket.emit('login', { username, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    setError('');
    setLoading(true);
    socket.emit('register', { username, password });
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0a1a',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff' }}>ORBIT FALL</h1>
      <form style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        padding: '30px',
        border: '1px solid #00d4ff',
        borderRadius: '8px',
        background: 'rgba(0, 212, 255, 0.05)',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label>USERNAME</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '8px', background: '#1a1a2a', border: '1px solid #00d4ff', color: '#fff' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label>PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '8px', background: '#1a1a2a', border: '1px solid #00d4ff', color: '#fff' }}
          />
        </div>
        {error && <div style={{ color: '#ff4444', fontSize: '0.8em' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              background: '#00d4ff',
              border: 'none',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            LOGIN
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: '1px solid #00d4ff',
              color: '#00d4ff',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            REGISTER
          </button>
        </div>
      </form>
    </div>
  );
};
