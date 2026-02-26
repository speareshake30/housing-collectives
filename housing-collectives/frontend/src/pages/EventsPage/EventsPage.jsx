import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './EventsPage.css';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events?visibility=public&limit=20`);
      setEvents(response.data.data || []);
    } catch (err) {
      setError('Failed to load events');
      // Mock data fallback
      setEvents([
        {
          id: '1',
          title: 'Community Dinner Night',
          description: 'Join us for a monthly potluck dinner at Sunshine Collective. Bring a dish to share!',
          start_at: '2024-03-15T18:00:00Z',
          end_at: '2024-03-15T22:00:00Z',
          location_name: 'Sunshine Collective Garden',
          location_address: '123 Sunshine Street, Berlin',
          collective: { name: 'Sunshine Collective', slug: 'sunshine-collective' },
          attendee_count: 23,
          max_attendees: 50,
          cover_image_url: null
        },
        {
          id: '2',
          title: 'Workshop: Sustainable Living',
          description: 'Learn practical tips for reducing your environmental footprint in community living.',
          start_at: '2024-03-20T14:00:00Z',
          end_at: '2024-03-20T17:00:00Z',
          location_name: 'Forest House',
          location_address: 'Uppsala, Sweden',
          collective: { name: 'Forest House', slug: 'forest-house' },
          attendee_count: 12,
          max_attendees: 20,
          cover_image_url: null
        },
        {
          id: '3',
          title: 'Open House: Urban Nest',
          description: 'Come see our space and meet the community. Tour starts at 2pm.',
          start_at: '2024-03-25T14:00:00Z',
          end_at: '2024-03-25T18:00:00Z',
          location_name: 'Urban Nest',
          location_address: 'Amsterdam, Netherlands',
          collective: { name: 'Urban Nest', slug: 'urban-nest' },
          attendee_count: 8,
          max_attendees: 30,
          cover_image_url: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="events-page">
      <div className="container">
        <div className="page-header">
          <h1>Events</h1>
          <p>Discover workshops, open houses, and community gatherings</p>
        </div>

        {/* Filter Tabs */}
        <div className="event-filters">
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`filter-btn ${filter === 'past' ? 'active' : ''}`}
            onClick={() => setFilter('past')}
          >
            Past
          </button>
          <button 
            className={`filter-btn ${filter === 'my-events' ? 'active' : ''}`}
            onClick={() => setFilter('my-events')}
          >
            My Events
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchEvents} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📅</span>
            <h3>No events found</h3>
            <p>Check back later for upcoming events!</p>
          </div>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-date">
                  <span className="event-month">
                    {new Date(event.start_at).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="event-day">
                    {new Date(event.start_at).getDate()}
                  </span>
                </div>
                
                <div className="event-content">
                  <div className="event-image">
                    {event.cover_image_url ? (
                      <img src={event.cover_image_url} alt={event.title} />
                    ) : (
                      <div className="event-placeholder">🎉</div>
                    )}
                  </div>
                  
                  <div className="event-details">
                    <Link to={`/events/${event.id}`} className="event-title">
                      {event.title}
                    </Link>
                    
                    <p className="event-meta">
                      <span>🕐 {formatTime(event.start_at)} - {formatTime(event.end_at)}</span>
                      <span>📍 {event.location_name}</span>
                    </p>
                    
                    <p className="event-description">
                      {event.description}
                    </p>
                    
                    <div className="event-footer">
                      <Link to={`/collectives/${event.collective.slug}`} className="event-collective">
                        Hosted by {event.collective.name}
                      </Link>
                      <span className="event-attendees">
                        👥 {event.attendee_count}/{event.max_attendees} going
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
