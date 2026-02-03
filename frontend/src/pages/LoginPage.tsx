import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.service';
import { useAuthStore } from '../store/authStore';
import './AuthPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

    if (!formData.email || !formData.password) {
      setError('Compila tutti i campi');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { accessToken, user } = response.data;
      setAuth(accessToken, user);
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Email o password non corretti');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Errore durante il login. Riprova.');
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
          <h1 className="auth-title">Accedi</h1>
          <span className="ornament">❦</span>
        </div>

        <div className="ornament-divider" />

        <p className="auth-subtitle">Benvenuto in Apocrifo</p>

        <form onSubmit={handleSubmit} className="auth-form">
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
              placeholder="La tua password"
              disabled={loading}
              autoComplete="current-password"
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
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        <div className="ornament-divider" />

        <div className="auth-footer">
          <p>Non hai un account?</p>
          <Link to="/register" className="link">
            Registrati qui
          </Link>
        </div>

        <div className="auth-footer">
          <Link to="/" className="link-secondary">
            ← Torna alla home
          </Link>
        </div>

        <div className="auth-demo">
          <p className="demo-note">
            <strong>Demo:</strong> admin@apocrifo.game / admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
