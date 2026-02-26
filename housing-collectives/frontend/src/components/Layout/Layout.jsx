import React from 'react';
import Navigation from '../Navigation/Navigation';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <a href="/" className="logo">
            🌿 Collective
          </a>
          <Navigation />
        </div>
      </header>
      
      <main className="main">
        {children}
      </main>
      
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Collective</h4>
            <p>Connecting European housing collectives with people seeking community.</p>
          </div>
          <div className="footer-section">
            <h4>Links</h4>
            <ul>
              <li><a href="/collectives">Find Collectives</a></li>
              <li><a href="/events">Events</a></li>
              <li><a href="/register">Join</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <ul>
              <li><a href="#">Contact</a></li>
              <li><a href="#">About</a></li>
              <li><a href="#">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Collective. Built with 💚 for the community.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
