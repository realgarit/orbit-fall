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
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Auto-resume session if token exists
    const savedToken = localStorage.getItem('orbitfall_session');
    const savedUsername = localStorage.getItem('orbitfall_username');
    if (savedToken && savedUsername) {
      setLoading(true);
      newSocket.emit('resume_session', { token: savedToken, username: savedUsername });
    }

    newSocket.on('login_response', (data: { success: boolean; message: string }) => {
      setLoading(false);
      if (!data.success) {
        setError(data.message);
        localStorage.removeItem('orbitfall_session');
      }
    });

    newSocket.on('login_success', (data: any) => {
      setLoading(false);
      // Save for persistence
      if (data.sessionToken) {
        localStorage.setItem('orbitfall_session', data.sessionToken);
        localStorage.setItem('orbitfall_username', data.username);
      }
      onLoginSuccess(data, newSocket);
    });

    newSocket.on('register_response', (data: { success: boolean; message: string }) => {
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
            <label htmlFor="username" style={{ fontSize: '0.8em', color: '#888', cursor: 'pointer' }}>USERNAME</label>
            <input
              id="username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              aria-invalid={!!error}
              aria-describedby={error ? 'login-feedback' : undefined}
              style={{ 
                padding: '10px', 
                background: '#1a1a2a', 
                border: `1px solid ${usernameFocused ? '#fff' : '#00d4ff'}`,
                color: '#fff',
                borderRadius: '4px',
                outline: 'none',
                boxShadow: usernameFocused ? '0 0 8px rgba(0, 212, 255, 0.5)' : 'none',
                transition: 'all 0.2s ease'
              }}
              placeholder="Enter callsign"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="password" style={{ fontSize: '0.8em', color: '#888', cursor: 'pointer' }}>PASSWORD</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              aria-invalid={!!error}
              aria-describedby={error ? 'login-feedback' : undefined}
              style={{ 
                padding: '10px', 
                background: '#1a1a2a', 
                border: `1px solid ${passwordFocused ? '#fff' : '#00d4ff'}`,
                color: '#fff',
                borderRadius: '4px',
                outline: 'none',
                boxShadow: passwordFocused ? '0 0 8px rgba(0, 212, 255, 0.5)' : 'none',
                transition: 'all 0.2s ease'
              }}
              placeholder="Enter secure code"
            />
          </div>

          {(error || successMessage) && (
            <div
              id="login-feedback"
              aria-live="polite"
              style={{
                color: error ? '#ff4444' : '#44ff44',
                fontSize: '0.9em',
                textAlign: 'center',
                padding: '8px',
                background: error ? 'rgba(255, 68, 68, 0.1)' : 'rgba(68, 255, 68, 0.1)',
                borderRadius: '4px',
                border: `1px solid ${error ? 'rgba(255, 68, 68, 0.3)' : 'rgba(68, 255, 68, 0.3)'}`
              }}
            >
              {error || successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
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
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
            onMouseEnter={() => setToggleHovered(true)}
            onMouseLeave={() => setToggleHovered(false)}
            onFocus={() => setToggleHovered(true)}
            onBlur={() => setToggleHovered(false)}
            aria-label={isRegistering ? 'Switch to login' : 'Switch to registration'}
            style={{
              background: 'none',
              border: 'none',
              color: '#00d4ff',
              cursor: 'pointer',
              textDecoration: toggleHovered ? 'none' : 'underline',
              padding: '2px 4px',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              transition: 'all 0.2s ease',
              borderRadius: '4px',
              outline: toggleHovered ? '1px solid #00d4ff' : 'none'
            }}
          >
            {isRegistering ? 'Login here' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
