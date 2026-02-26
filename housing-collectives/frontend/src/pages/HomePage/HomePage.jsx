import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './HomePage.css';

const HomePage = () => {
  const [collectives, setCollectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollectives();
  }, []);

  const fetchCollectives = async () => {
    try {
      setLoading(true);
      const response = await api.get('/collectives?limit=6');
      setCollectives(response.data.data || []);
    } catch (err) {
      setError('Failed to load collectives');
      // Use mock data if API fails
      setCollectives([
        {
          id: '1',
          slug: 'sunshine-collective',
          name: 'Sunshine Collective',
          description: 'A vibrant community in Berlin focused on sustainability and shared living.',
          location: { city: 'Berlin', country: 'DE' },
          cover_image_url: null,
          member_count: 12,
          capacity: 15,
          accepting_members: true
        },
        {
          id: '2',
          slug: 'forest-house',
          name: 'Forest House',
          description: 'Living in harmony with nature in the Swedish countryside.',
          location: { city: 'Uppsala', country: 'SE' },
          cover_image_url: null,
          member_count: 8,
          capacity: 10,
          accepting_members: true
        },
        {
          id: '3',
          slug: 'urban-nest',
          name: 'Urban Nest',
          description: 'A modern co-living space in the heart of Amsterdam.',
          location: { city: 'Amsterdam', country: 'NL' },
          cover_image_url: null,
          member_count: 20,
          capacity: 24,
          accepting_members: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Find Your Community</h1>
          <p className="hero-subtitle">
            Discover housing collectives across Europe. Connect with like-minded people 
            and find a place to call home.
          </p>
          <div className="hero-actions">
            <Link to="/collectives" className="btn btn-primary">
              Explore Collectives
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Join the Community
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">150+</span>
            <span className="stat-label">Collectives</span>
          </div>
          <div className="stat">
            <span className="stat-number">12</span>
            <span className="stat-label">Countries</span>
          </div>
          <div className="stat">
            <span className="stat-number">2,000+</span>
            <span className="stat-label">Members</span>
          </div>
        </div>
      </section>

      {/* Featured Collectives */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Collectives</h2>
            <Link to="/collectives" className="view-all">
              View all →
            </Link>
          </div>
          
          {loading ? (
            <div className="loading">Loading collectives...</div>
          ) : (
            <div className="collectives-grid">
              {collectives.map((collective) => (
                <Link 
                  to={`/collectives/${collective.slug}`} 
                  key={collective.id}
                  className="collective-card"
                >
                  <div className="collective-card-image">
                    {collective.cover_image_url ? (
                      <img src={collective.cover_image_url} alt={collective.name} />
                    ) : (
                      <div className="placeholder-image">
                        🏠
                      </div>
                    )}
                    {collective.accepting_members && (
                      <span className="badge badge-success">Open</span>
                    )}
                  </div>
                  <div className="collective-card-content">
                    <h3>{collective.name}</h3>
                    <p className="collective-location">
                      📍 {collective.location.city}, {collective.location.country}
                    </p>
                    <p className="collective-description">
                      {collective.description}
                    </p>
                    <div className="collective-meta">
                      <span>👥 {collective.member_count}/{collective.capacity}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">🔍</div>
              <h3>Discover</h3>
              <p>Browse collectives across Europe. Filter by location, size, and more.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">💬</div>
              <h3>Connect</h3>
              <p>Message collectives directly and get to know the community.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🏡</div>
              <h3>Join</h3>
              <p>Apply to join or attend events to experience collective living.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
