import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api.service';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/rooms', {
        type: 'PRIVATE',
        maxPlayers: 8,
        numRounds: 5,
      });
      const { code } = response.data;
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError('Errore nella creazione della stanza');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (roomCode.trim().length === 0) {
      setError('Inserisci un codice stanza');
      return;
    }
    navigate(`/lobby/${roomCode.toUpperCase()}`);
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="home-page">
        <div className="home-card">
          <div className="home-header">
            <span className="ornament">❦</span>
            <h1 className="home-title">Apocrifo</h1>
            <span className="ornament">❦</span>
          </div>
          
          <div className="ornament-divider" />
          
          <p className="home-subtitle">
            Il party game delle definizioni creative
          </p>
          
          <div className="ornament-divider" />
          
          <div className="home-actions">
            <Link to="/login" className="btn btn-primary">
              Accedi
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Registrati
            </Link>
          </div>
          
          <div className="home-description">
            <p>Inventa definizioni credibili per parole antiche e inganna i tuoi amici!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-card home-card-wide">
        <div className="home-header">
          <span className="ornament">❦</span>
          <h1 className="home-title">Apocrifo</h1>
          <span className="ornament">❦</span>
        </div>

        <div className="ornament-divider" />

        <div className="welcome-section">
          <p className="welcome-text">Benvenuto, <strong>{user?.nickname}</strong>!</p>
        </div>

        <div className="game-actions">
          <div className="action-section">
            <h2 className="section-title">Crea una nuova partita</h2>
            <p className="section-description">
              Invita i tuoi amici condividendo il codice stanza
            </p>
            <button 
              onClick={handleCreateRoom} 
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Creazione...' : '🎲 Crea Stanza'}
            </button>
          </div>

          <div className="ornament-divider" />

          <div className="action-section">
            <h2 className="section-title">Entra in una partita</h2>
            <p className="section-description">
              Hai un codice stanza? Inseriscilo qui
            </p>
            <div className="join-room-form">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Es: ABC123"
                maxLength={6}
                className="room-code-input"
              />
              <button 
                onClick={handleJoinRoom} 
                className="btn btn-secondary"
                disabled={!roomCode.trim()}
              >
                🚪 Entra
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        <div className="ornament-divider" />

        <div className="home-footer">
          <button onClick={handleLogout} className="link-secondary">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
