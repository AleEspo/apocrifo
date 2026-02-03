import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../contexts/SocketContext';
import './LobbyPage.css';

interface Player {
  id: string;
  nickname: string;
  isReady: boolean;
  isConnected: boolean;
}

interface Room {
  id: string;
  code: string;
  hostId: string;
  maxPlayers: number;
  numRounds: number;
  writeTimer: number;
  voteTimer: number;
  currentState: string;
}

const LobbyPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, isConnected, emit, on, off } = useSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isHost = room?.hostId === user?.id;
  const myPlayer = players.find(p => p.id === user?.id);
  const allPlayersReady = players.length >= 3 && players.every(p => p.isReady);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const joinRoom = async () => {
      try {
        const response = await emit('room:join', { roomCode });
        if (response.success) {
          setRoom(response.room);
          setPlayers(response.players);
          
          // Set isReady based on my player status
          const me = response.players.find((p: any) => p.id === response.player.id);
          if (me) {
            setIsReady(me.isReady);
          }
          
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'Impossibile entrare nella stanza');
        setLoading(false);
      }
    };

    joinRoom();

    on('room:player_joined', (data: any) => {
      setPlayers(prev => [...prev, data.player]);
    });

    on('room:player_left', (data: any) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    on('room:player_ready', (data: any) => {
      setPlayers(prev =>
        prev.map(p =>
          p.id === data.playerId ? { ...p, isReady: data.isReady } : p
        )
      );
      
      // Update my ready status if it's me
      if (data.playerId === myPlayer?.id) {
        setIsReady(data.isReady);
      }
    });

    on('game:state_change', (data: any) => {
      if (data.state === 'SHOW_WORD') {
        navigate(`/game/${roomCode}`);
      }
    });

    return () => {
      off('room:player_joined');
      off('room:player_left');
      off('room:player_ready');
      off('game:state_change');
      emit('room:leave', {});
    };
  }, [isConnected, socket, roomCode]);

  const handleToggleReady = async () => {
    try {
      await emit('room:ready', { isReady: !isReady, roomCode });
      setIsReady(!isReady);
    } catch (err) {
      setError('Errore nel segnare pronto');
    }
  };

  const handleStartGame = async () => {
    try {
      await emit('game:start', { roomCode });
    } catch (err: any) {
      setError(err.message || 'Impossibile avviare il gioco');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode || '');
    alert('Codice copiato! Condividilo con i tuoi amici');
  };

  const handleLeave = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="lobby-page">
        <div className="lobby-card">
          <div className="loading">Caricamento stanza...</div>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="lobby-page">
        <div className="lobby-card">
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
          <button onClick={handleLeave} className="btn btn-secondary">
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <div className="lobby-header">
          <span className="ornament">❦</span>
          <h1 className="lobby-title">Sala d'Attesa</h1>
          <span className="ornament">❦</span>
        </div>

        <div className="ornament-divider" />

        <div className="room-code-section">
          <p className="room-code-label">Codice Stanza</p>
          <div className="room-code-display" onClick={handleCopyCode}>
            <span className="room-code">{roomCode}</span>
            <span className="copy-hint">📋 Click per copiare</span>
          </div>
        </div>

        <div className="ornament-divider" />

        <div className="players-section">
          <h2 className="section-title">
            Giocatori ({players.length}/{room?.maxPlayers})
          </h2>
          <div className="players-list">
            {players.map((player) => (
              <div
                key={player.id}
                className={`player-item ${player.isReady ? 'ready' : ''}`}
              >
                <span className="player-name">
                  {player.nickname}
                  {room && player.id === room.hostId && ' 👑'}
                </span>
                <span className="player-status">
                  {player.isReady ? '✓ Pronto' : '⏳ In attesa'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ornament-divider" />

        {isHost && (
          <div className="settings-section">
            <h2 className="section-title">Impostazioni</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <span className="setting-label">Round:</span>
                <span className="setting-value">{room?.numRounds}</span>
              </div>
              <div className="setting-item">
                <span className="setting-label">Tempo scrittura:</span>
                <span className="setting-value">{room?.writeTimer}s</span>
              </div>
              <div className="setting-item">
                <span className="setting-label">Tempo voto:</span>
                <span className="setting-value">{room?.voteTimer}s</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        <div className="lobby-actions">
          {/* Mostra bottone pronto per TUTTI (anche host) */}
          <button
            onClick={handleToggleReady}
            className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'} btn-large`}
          >
            {isReady ? '❌ Annulla' : '✓ Sono Pronto'}
          </button>

          {/* Bottone start solo per host */}
          {isHost && (
            <button
              onClick={handleStartGame}
              className="btn btn-primary btn-large"
              disabled={!allPlayersReady}
            >
              {allPlayersReady
                ? '🎮 Inizia Partita'
                : `Aspetta che tutti siano pronti (${players.filter(p => p.isReady).length}/${players.length} pronti, min 3)`}
            </button>
          )}

          <button onClick={handleLeave} className="btn btn-secondary">
            {isHost ? 'Chiudi Stanza' : 'Esci dalla Stanza'}
          </button>
        </div>

        <div className="lobby-hint">
          <p>
            {isHost
              ? '💡 Anche tu devi premere "Sono Pronto" prima di iniziare!'
              : '💡 Premi "Sono Pronto" quando sei pronto a giocare'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
