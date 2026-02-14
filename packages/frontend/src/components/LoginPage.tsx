import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface LoginPageProps {
  onLoginSuccess: (data: any, socket: Socket) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

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
        setSuccessMessage('Registration successful! Please log in.');
        setIsRegistering(false); // Switch back to login mode automatically
        setUsername('');
        setPassword('');
      } else {
        setError(data.message);
      }
    });

    return () => {
      // Don't disconnect here if we're moving to the game
    };
  }, [onLoginSuccess]);

  const validateInput = () => {
    if (!username.trim()) {
      setError('Username cannot be empty');
      return false;
    }
    if (!password.trim()) {
      setError('Password cannot be empty');
      return false;
    }
    return true;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    setError('');
    setSuccessMessage('');
    
    if (!validateInput()) return;

    setLoading(true);
    socket.emit('login', { username, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    setError('');
    setSuccessMessage('');

    if (!validateInput()) return;

    setLoading(true);
    socket.emit('register', { username, password });
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccessMessage('');
    setUsername('');
    setPassword('');
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
      <h1 style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff', marginBottom: '20px' }}>ORBIT FALL</h1>
      
      <div style={{
        width: '300px',
        padding: '30px',
        border: '1px solid #00d4ff',
        borderRadius: '8px',
        background: 'rgba(0, 212, 255, 0.05)',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          color: '#fff', 
          fontSize: '1.2em', 
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {isRegistering ? 'New Pilot Registration' : 'Pilot Login'}
        </h2>

        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.8em', color: '#888' }}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ 
                padding: '10px', 
                background: '#1a1a2a', 
                border: '1px solid #00d4ff', 
                color: '#fff',
                borderRadius: '4px',
                outline: 'none'
              }}
              placeholder="Enter callsign"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.8em', color: '#888' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                padding: '10px', 
                background: '#1a1a2a', 
                border: '1px solid #00d4ff', 
                color: '#fff',
                borderRadius: '4px',
                outline: 'none'
              }}
              placeholder="Enter secure code"
            />
          </div>

          {error && (
            <div style={{ 
              color: '#ff4444', 
              fontSize: '0.9em', 
              textAlign: 'center',
              padding: '8px',
              background: 'rgba(255, 68, 68, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 68, 68, 0.3)'
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{ 
              color: '#44ff44', 
              fontSize: '0.9em', 
              textAlign: 'center',
              padding: '8px',
              background: 'rgba(68, 255, 68, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(68, 255, 68, 0.3)'
            }}>
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: '#00d4ff',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '10px',
              fontSize: '1em',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'PROCESSING...' : (isRegistering ? 'REGISTER' : 'LOGIN')}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.9em' }}>
          <span style={{ color: '#888' }}>
            {isRegistering ? 'Already have an account? ' : 'Need an account? '}
          </span>
          <button
            onClick={toggleMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#00d4ff',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            {isRegistering ? 'Login here' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
