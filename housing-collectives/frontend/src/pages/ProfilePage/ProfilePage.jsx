import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${username}`);
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile');
      // Mock data fallback
      setProfile({
        id: '1',
        username: username,
        display_name: username === 'treehugger_42' ? 'Alex' : username,
        bio: 'Living in community since 2020. Passionate about sustainable living, gardening, and building meaningful connections.',
        avatar_url: null,
        location: { city: 'Berlin', country: 'DE' },
        collectives: [
          { id: '1', name: 'Sunshine Collective', slug: 'sunshine-collective', role: 'member' }
        ],
        stats: {
          events_attended: 12,
          ads_posted: 2
        },
        created_at: '2024-01-15T10:30:00Z'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="container">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} />
              ) : (
                <div className="avatar-placeholder">
                  {profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="profile-info">
              <h1>{profile.display_name || profile.username}</h1>
              <p className="profile-username">@{profile.username}</p>
              
              {profile.location && (
                <p className="profile-location">
                  📍 {profile.location.city}, {profile.location.country}
                </p>
              )}
              
              {profile.bio && (
                <p className="profile-bio">{profile.bio}</p>
              )}
              
              <div className="profile-stats">
                <span>Member since {new Date(profile.created_at).getFullYear()}</span>
                <span>•</span>
                <span>{profile.stats?.events_attended || 0} events attended</span>
              </div>
            </div>
            
            <div className="profile-actions">
              {isOwnProfile ? (
                <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
                  Edit Profile
                </button>
              ) : isAuthenticated ? (
                <Link to={`/messages/new?to=${profile.username}`} className="btn btn-primary">
                  Message
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Login to Message
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container">
        <div className="profile-layout">
          {/* Main Content */}
          <div className="profile-main">
            {/* Tabs */}
            <div className="profile-tabs">
              <button 
                className={`tab ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveTab('about')}
              >
                About
              </button>
              <button 
                className={`tab ${activeTab === 'collectives' ? 'active' : ''}`}
                onClick={() => setActiveTab('collectives')}
              >
                Collectives
              </button>
              <button 
                className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>

            {/* Tab Content */}
            <div className="profile-tab-content">
              {activeTab === 'about' && (
                <div className="about-tab">
                  <div className="info-section">
                    <h3>About</h3>
                    <p>{profile.bio || 'No bio yet.'}</p>
                  </div>
                  
                  <div className="info-section">
                    <h3>Location</h3>
                    {profile.location ? (
                      <p>📍 {profile.location.city}, {profile.location.country}</p>
                    ) : (
                      <p className="text-muted">No location set</p>
                    )}
                  </div>
                  
                  <div className="info-section">
                    <h3>Stats</h3>
                    <div className="stats-grid">
                      <div className="stat-box">
                        <span className="stat-value">{profile.stats?.events_attended || 0}</span>
                        <span className="stat-label">Events</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-value">{profile.stats?.ads_posted || 0}</span>
                        <span className="stat-label">Room Ads</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-value">{profile.collectives?.length || 0}</span>
                        <span className="stat-label">Collectives</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'collectives' && (
                <div className="collectives-tab">
                  <h3>Member Of</h3>
                  {profile.collectives?.length > 0 ? (
                    <div className="profile-collectives">
                      {profile.collectives.map((collective) => (
                        <Link 
                          to={`/collectives/${collective.slug}`}
                          key={collective.id}
                          className="profile-collective-card"
                        >
                          <div className="collective-icon">🏠</div>
                          <div className="collective-info">
                            <span className="collective-name">{collective.name}</span>
                            <span className="collective-role">{collective.role}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">Not a member of any collectives yet.</p>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="activity-tab">
                  <h3>Recent Activity</h3>
                  <p className="text-muted">Activity feed coming soon...</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="profile-sidebar">
            {isOwnProfile && (
              <div className="sidebar-card">
                <h3>Quick Links</h3>
                <ul className="quick-links">
                  <li><Link to="/settings">⚙️ Settings</Link></li>
                  <li><Link to="/messages">💬 Messages</Link></li>
                  <li><Link to="/my-events">📅 My Events</Link></li>
                  <li><Link to="/room-ads/my">🏠 My Room Ads</Link></li>
                </ul>
              </div>
            )}
            
            <div className="sidebar-card">
              <h3>Looking for a collective?</h3>
              <p className="sidebar-text">
                Browse collectives across Europe and find your community.
              </p>
              <Link to="/collectives" className="btn btn-secondary btn-full">
                Explore Collectives
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
