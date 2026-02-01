import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
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
      </div>
    </div>
  );
};

export default HomePage;
