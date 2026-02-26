import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navigation">
      <ul className="nav-list">
        <li className="nav-item">
          <Link to="/collectives" className="nav-link">Find Collectives</Link>
        </li>
        <li className="nav-item">
          <Link to="/events" className="nav-link">Events</Link>
        </li>
        
        {isAuthenticated ? (
          <>
            <li className="nav-item">
              <Link to={`/profile/${user?.username}`} className="nav-link">
                {user?.display_name || user?.username}
              </Link>
            </li>
            <li className="nav-item">
              <button onClick={logout} className="nav-button">
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link to="/login" className="nav-link">Login</Link>
            </li>
            <li className="nav-item">
              <Link to="/register" className="nav-link nav-link-primary">Join</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;
