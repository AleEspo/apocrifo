import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../contexts/SocketContext';
import './GamePage.css';

interface Player {
  id: string;
  nickname: string;
  score: number;
}

interface Word {
  lemma: string;
  partOfSpeech: string;
}

interface Choice {
  id: string;
  definition: string;
}

interface ScoreBreakdown {
  playerId: string;
  nickname: string;
  pointsEarned: number;
  breakdown: {
    correctVote?: number;
    votesReceived?: number;
  };
}

const GamePage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, isConnected, emit, on, off } = useSocket();

  const [gameState, setGameState] = useState<string>('LOADING');
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [definition, setDefinition] = useState('');
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [results, setResults] = useState<ScoreBreakdown[]>([]);
  const [correctSubmissionId, setCorrectSubmissionId] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConnected || !socket) return;

    console.log('🎮 GamePage mounted, requesting current state...');

    // Richiedi lo stato corrente
    const fetchCurrentState = async () => {
      try {
        const response = await emit('game:get_state', { roomCode });
        if (response.success && response.state) {
          console.log('📥 Received current state:', response.state);
          handleStateChange({ state: response.state, data: response.data });
        }
      } catch (err) {
        console.error('Failed to get game state:', err);
      }
    };

    fetchCurrentState();

    on('game:state_change', handleStateChange);
    on('game:submission_received', () => console.log('📝 Submission received'));
    on('game:vote_received', () => console.log('✓ Vote received'));

    return () => {
      off('game:state_change');
      off('game:submission_received');
      off('game:vote_received');
    };
  }, [isConnected, socket, roomCode]);

  const handleStateChange = (payload: any) => {
    console.log('🎮 State change:', payload.state, payload);
    setGameState(payload.state);
    setError('');

    const data = payload.data || {};

    switch (payload.state) {
      case 'SHOW_WORD':
        setCurrentWord(data.word);
        setRoundNumber(data.roundNumber);
        setTotalRounds(data.totalRounds);
        setCurrentRoundId(data.roundId || '');
        setDefinition('');
        setHasSubmitted(false);
        setChoices([]);
        setSelectedChoice(null);
        if (data.leaderboard) {
          setPlayers(data.leaderboard);
        }
        break;

      case 'WRITE_DEF':
        setCurrentWord(data.word);
        setCurrentRoundId(data.roundId || '');
        setTimeLeft(data.timeLimit);
        if (data.expiresAt) {
          startCountdown(data.expiresAt);
        }
        if (data.leaderboard) {
          setPlayers(data.leaderboard);
        }
        break;

      case 'REVEAL_CHOICES':
        setChoices(data.options || []);
        break;

      case 'VOTE':
        setChoices(data.options || []);
        setCurrentRoundId(data.roundId || '');
        setTimeLeft(data.timeLimit);
        if (data.expiresAt) {
          startCountdown(data.expiresAt);
        }
        break;

      case 'RESULTS':
        setResults(data.scoring || []);
        setCorrectSubmissionId(data.correctSubmissionId);
        if (data.leaderboard) {
          setPlayers(data.leaderboard.map((p: any) => ({
            id: p.playerId,
            nickname: p.nickname,
            score: p.totalScore,
          })));
        }
        break;

      case 'END_GAME':
        if (data.finalLeaderboard) {
          setPlayers(data.finalLeaderboard.map((p: any) => ({
            id: p.playerId,
            nickname: p.nickname,
            score: p.score,
          })));
        }
        break;
    }
  };

  const startCountdown = (expiresAt: number) => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleSubmitDefinition = async () => {
    if (!definition.trim()) {
      setError('Scrivi una definizione!');
      return;
    }

    if (!currentRoundId) {
      setError('Round ID mancante!');
      return;
    }

    try {
      await emit('game:submit_definition', { 
        definition: definition.trim(),
        roundId: currentRoundId,
        roomCode,
      });
      setHasSubmitted(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Errore nell\'invio');
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!currentRoundId) {
      setError('Round ID mancante!');
      return;
    }

    try {
      await emit('game:vote', { 
        submissionId,
        roundId: currentRoundId,
        roomCode,
      });
      setSelectedChoice(submissionId);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Errore nel voto');
    }
  };

  const handleBackToLobby = () => {
    navigate(`/lobby/${roomCode}`);
  };

  const handleLeave = () => {
    navigate('/');
  };

  const renderContent = () => {
    switch (gameState) {
      case 'LOADING':
        return (
          <div className="loading">
            <p>In attesa che il gioco inizi...</p>
          </div>
        );

      case 'SHOW_WORD':
        return (
          <div className="game-phase show-word">
            <div className="word-card-large">
              <div className="word-header">
                <span className="ornament">❦</span>
                <h1 className="word-lemma">{currentWord?.lemma}</h1>
                <span className="ornament">❦</span>
              </div>
              <p className="word-pos">({currentWord?.partOfSpeech})</p>
              <div className="ornament-divider" />
              <p className="instruction">Preparati a scrivere una definizione credibile...</p>
            </div>
          </div>
        );

      case 'WRITE_DEF':
        return (
          <div className="game-phase write-def">
            <div className="word-card">
              <h2 className="word-lemma-small">{currentWord?.lemma}</h2>
              <p className="word-pos-small">({currentWord?.partOfSpeech})</p>
            </div>

            <div className="timer-section">
              <div className="timer">{timeLeft}s</div>
              <p className="timer-label">Tempo rimasto</p>
            </div>

            {hasSubmitted ? (
              <div className="submitted-message">
                <span className="check-icon">✓</span>
                <p>Definizione inviata! Aspettando gli altri giocatori...</p>
              </div>
            ) : (
              <div className="definition-input-section">
                <p className="instruction">Scrivi una definizione che sembri vera:</p>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="Es: Antico strumento utilizzato per..."
                  maxLength={500}
                  rows={4}
                  className="definition-input"
                />
                <div className="char-count">{definition.length}/500</div>
                <button
                  onClick={handleSubmitDefinition}
                  className="btn btn-primary btn-large"
                  disabled={!definition.trim()}
                >
                  📝 Invia Definizione
                </button>
              </div>
            )}
          </div>
        );

      case 'REVEAL_CHOICES':
        return (
          <div className="game-phase reveal-choices">
            <div className="word-card">
              <h2 className="word-lemma-small">{currentWord?.lemma}</h2>
            </div>
            <p className="instruction">Ecco tutte le definizioni...</p>
            <div className="choices-list">
              {choices.map((choice, index) => (
                <div key={choice.id} className="choice-card">
                  <span className="choice-number">{String.fromCharCode(65 + index)}</span>
                  <p className="choice-text">{choice.definition}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'VOTE':
        return (
          <div className="game-phase vote">
            <div className="word-card">
              <h2 className="word-lemma-small">{currentWord?.lemma}</h2>
            </div>

            <div className="timer-section">
              <div className="timer">{timeLeft}s</div>
              <p className="timer-label">Tempo per votare</p>
            </div>

            <p className="instruction">Quale è la definizione vera?</p>

            <div className="choices-list">
              {choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => handleVote(choice.id)}
                  className={`choice-card clickable ${
                    selectedChoice === choice.id ? 'selected' : ''
                  }`}
                  disabled={!!selectedChoice}
                >
                  <span className="choice-number">{String.fromCharCode(65 + index)}</span>
                  <p className="choice-text">{choice.definition}</p>
                  {selectedChoice === choice.id && (
                    <span className="selected-badge">✓ Votato</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'RESULTS':
        return (
          <div className="game-phase results">
            <h2 className="results-title">Risultati del Round</h2>

            <div className="correct-answer">
              <p className="correct-label">La definizione corretta era:</p>
              <div className="choice-card correct">
                <p className="choice-text">
                  {choices.find(c => c.id === correctSubmissionId)?.definition}
                </p>
              </div>
            </div>

            <div className="ornament-divider" />

            <h3 className="section-title">Punteggi del Round</h3>
            <div className="scores-list">
              {results.map((result) => (
                <div key={result.playerId} className="score-item">
                  <span className="player-name">{result.nickname}</span>
                  <div className="points-breakdown">
                    {result.breakdown.correctVote && (
                      <span className="point-detail">✓ Risposta corretta: +{result.breakdown.correctVote}</span>
                    )}
                    {result.breakdown.votesReceived && (
                      <span className="point-detail">🎭 Ingannati: +{result.breakdown.votesReceived}</span>
                    )}
                  </div>
                  <span className="points-earned">+{result.pointsEarned}</span>
                </div>
              ))}
            </div>

            <div className="ornament-divider" />

            <h3 className="section-title">Classifica</h3>
            <div className="leaderboard">
              {players.map((player, index) => (
                <div key={player.id} className="leaderboard-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="player-name">{player.nickname}</span>
                  <span className="total-score">{player.score} punti</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'END_GAME':
        return (
          <div className="game-phase end-game">
            <div className="game-header">
              <span className="ornament">❦</span>
              <h1 className="game-over-title">Partita Terminata!</h1>
              <span className="ornament">❦</span>
            </div>

            <div className="ornament-divider" />

            <div className="final-leaderboard">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`final-position position-${index + 1}`}
                >
                  <div className="position-badge">
                    {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="player-info">
                    <h3 className="player-name">{player.nickname}</h3>
                    <p className="final-score">{player.score} punti</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="game-actions">
              <button onClick={handleBackToLobby} className="btn btn-primary btn-large">
                🔄 Rivincita
              </button>
              <button onClick={handleLeave} className="btn btn-secondary">
                🏠 Torna alla Home
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="loading">
            <p>Caricamento...</p>
          </div>
        );
    }
  };

  return (
    <div className="game-page">
      <div className="game-container">
        <div className="game-topbar">
          <div className="round-info">
            {roundNumber > 0 ? `Round ${roundNumber}/${totalRounds}` : 'In attesa...'}
          </div>
          <div className="room-code-badge">{roomCode}</div>
        </div>

        <div className="game-content">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          {renderContent()}
        </div>

        {gameState !== 'END_GAME' && gameState !== 'LOADING' && players.length > 0 && (
          <div className="game-sidebar">
            <h3 className="sidebar-title">Classifica</h3>
            <div className="sidebar-scores">
              {players.map((player, index) => (
                <div key={player.id} className="sidebar-score-item">
                  <span className="sidebar-rank">#{index + 1}</span>
                  <span className="sidebar-name">{player.nickname}</span>
                  <span className="sidebar-score">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;
