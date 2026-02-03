import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.service';
import { useAuthStore } from '../store/authStore';
import './AuthPage.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.nickname) {
      setError('Compila tutti i campi');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return;
    }

    if (formData.nickname.length < 3) {
      setError('Il nickname deve contenere almeno 3 caratteri');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
      });

      const { accessToken, user } = response.data;
      setAuth(accessToken, user);
      navigate('/');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Errore durante la registrazione. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="ornament">❦</span>
          <h1 className="auth-title">Registrazione</h1>
          <span className="ornament">❦</span>
        </div>

        <div className="ornament-divider" />

        <p className="auth-subtitle">Crea il tuo account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="Il tuo nome da gioco"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tua@email.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimo 6 caratteri"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Conferma Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Ripeti la password"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Registrazione...' : 'Registrati'}
          </button>
        </form>

        <div className="ornament-divider" />

        <div className="auth-footer">
          <p>Hai già un account?</p>
          <Link to="/login" className="link">
            Accedi qui
          </Link>
        </div>

        <div className="auth-footer">
          <Link to="/" className="link-secondary">
            ← Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
