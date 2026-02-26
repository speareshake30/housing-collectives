import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './CollectiveDetailPage.css';

const CollectiveDetailPage = () => {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [collective, setCollective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [joinMessage, setJoinMessage] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchCollective();
  }, [slug]);

  const fetchCollective = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/collectives/${slug}`);
      setCollective(response.data);
    } catch (err) {
      setError('Failed to load collective');
      // Mock data fallback
      setCollective({
        id: '1',
        slug: 'sunshine-collective',
        name: 'Sunshine Collective',
        description: 'A vibrant community in Berlin focused on sustainability, shared meals, and collaborative living. We value open communication, environmental consciousness, and creating a warm, welcoming home for everyone.',
        location: { city: 'Berlin', country: 'DE', address: '123 Sunshine Street' },
        founded_at: '2020-03-15',
        capacity: 15,
        current_residents: 12,
        member_count: 12,
        website_url: 'https://sunshine-collective.example.com',
        contact_email: 'hello@sunshine-collective.example.com',
        accepting_members: true,
        application_required: true,
        gallery_images: [],
        is_member: false,
        user_role: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      await api.post(`/collectives/${slug}/join`, { message: joinMessage });
      setShowJoinModal(false);
      alert('Application submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit application');
    }
  };

  if (loading) {
    return (
      <div className="collective-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading collective...</p>
        </div>
      </div>
    );
  }

  if (error && !collective) {
    return (
      <div className="collective-detail-page">
        <div className="error-container">
          <p>{error}</p>
          <Link to="/collectives" className="btn btn-primary">
            Back to Collectives
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collective-detail-page">
      {/* Cover Image */}
      <div className="collective-cover">
        {collective.cover_image_url ? (
          <img src={collective.cover_image_url} alt={collective.name} />
        ) : (
          <div className="cover-placeholder">
            <span>🏠</span>
          </div>
        )}
        <div className="cover-overlay">
          <div className="container">
            <div className="collective-header-content">
              <h1>{collective.name}</h1>
              <p className="collective-location">
                📍 {collective.location.city}, {collective.location.country}
              </p>
              <div className="collective-badges">
                {collective.accepting_members && (
                  <span className="badge badge-success">Accepting Members</span>
                )}
                <span className="badge">
                  👥 {collective.current_residents}/{collective.capacity}
                </span>
                <span className="badge">
                  Since {new Date(collective.founded_at).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container">
        <div className="collective-detail-layout">
          {/* Main Content */}
          <div className="collective-main">
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveTab('about')}
              >
                About
              </button>
              <button 
                className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                Members
              </button>
              <button 
                className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                onClick={() => setActiveTab('events')}
              >
                Events
              </button>
              <button 
                className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                Gallery
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'about' && (
                <div className="about-section">
                  <h2>About {collective.name}</h2>
                  <p className="description">{collective.description}</p>
                  
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Location</span>
                      <span className="info-value">
                        {collective.location.address}, {collective.location.city}, {collective.location.country}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Founded</span>
                      <span className="info-value">
                        {new Date(collective.founded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Capacity</span>
                      <span className="info-value">{collective.capacity} residents</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Application Required</span>
                      <span className="info-value">
                        {collective.application_required ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="members-section">
                  <h2>Members</h2>
                  <p className="text-muted">Member list coming soon...</p>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="events-section">
                  <h2>Events</h2>
                  <p className="text-muted">No upcoming events.</p>
                  {isAuthenticated && collective.is_member && (
                    <button className="btn btn-primary">
                      Create Event
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && (
                <div className="gallery-section">
                  <h2>Gallery</h2>
                  {collective.gallery_images?.length > 0 ? (
                    <div className="gallery-grid">
                      {collective.gallery_images.map((img, idx) => (
                        <img key={idx} src={img} alt={`${collective.name} ${idx + 1}`} />
                      ))}
                    </div>
                  ) : (
                    <div className="gallery-placeholder">
                      <span>📷</span>
                      <p>No photos yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="collective-sidebar">
            <div className="sidebar-card">
              <h3>Actions</h3>
              {isAuthenticated ? (
                collective.is_member ? (
                  <div className="member-actions">
                    <p className="member-status">✨ You are a member</p>
                    <Link to={`/conversations/new?collective=${collective.id}`} className="btn btn-secondary btn-full">
                      Message Collective
                    </Link>
                  </div>
                ) : collective.accepting_members ? (
                  <>
                    <button 
                      className="btn btn-primary btn-full"
                      onClick={() => setShowJoinModal(true)}
                    >
                      Apply to Join
                    </button>
                    <Link to={`/conversations/new?collective=${collective.id}`} className="btn btn-secondary btn-full">
                      Send Message
                    </Link>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-full" disabled>
                      Not Accepting Members
                    </button>
                    <Link to={`/conversations/new?collective=${collective.id}`} className="btn btn-secondary btn-full">
                      Send Message
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary btn-full">
                    Login to Connect
                  </Link>
                  <p className="login-hint">
                    Create an account to apply or message this collective
                  </p>
                </>
              )}
            </div>

            {collective.website_url && (
              <div className="sidebar-card">
                <h3>Links</h3>
                <a 
                  href={collective.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  🌐 Visit Website →
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Apply to Join {collective.name}</h3>
            <p>Tell us a bit about yourself and why you'd like to join:</p>
            <textarea
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Hello! I'm interested in joining because..."
              rows={5}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleJoin}>
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectiveDetailPage;
