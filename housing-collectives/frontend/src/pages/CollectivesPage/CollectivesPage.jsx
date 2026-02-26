import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './CollectivesPage.css';

const CollectivesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [collectives, setCollectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    country: searchParams.get('country') || '',
    accepting_members: searchParams.get('accepting_members') === 'true'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    has_more: false
  });

  useEffect(() => {
    fetchCollectives();
  }, [filters, pagination.page]);

  const fetchCollectives = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.country) params.append('country', filters.country);
      if (filters.accepting_members) params.append('accepting_members', 'true');
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await api.get(`/collectives?${params.toString()}`);
      setCollectives(response.data.data || []);
      setPagination(response.data.pagination || pagination);
    } catch (err) {
      setError('Failed to load collectives');
      // Mock data fallback
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
          accepting_members: true,
          founded_at: '2020-03-15'
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
          accepting_members: true,
          founded_at: '2019-06-01'
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
          accepting_members: false,
          founded_at: '2021-01-10'
        },
        {
          id: '4',
          slug: 'mountain-retreat',
          name: 'Mountain Retreat',
          description: 'A peaceful collective in the Italian Alps with stunning views.',
          location: { city: 'Aosta', country: 'IT' },
          cover_image_url: null,
          member_count: 6,
          capacity: 8,
          accepting_members: true,
          founded_at: '2018-09-20'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.country) params.set('country', newFilters.country);
    if (newFilters.accepting_members) params.set('accepting_members', 'true');
    setSearchParams(params);
    
    setPagination({ ...pagination, page: 1 });
  };

  const clearFilters = () => {
    setFilters({ q: '', country: '', accepting_members: false });
    setSearchParams({});
  };

  return (
    <div className="collectives-page">
      <div className="container">
        <div className="page-header">
          <h1>Find a Collective</h1>
          <p>Discover intentional communities across Europe</p>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search collectives..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="filter-select"
            >
              <option value="">All Countries</option>
              <option value="DE">Germany</option>
              <option value="SE">Sweden</option>
              <option value="NL">Netherlands</option>
              <option value="IT">Italy</option>
              <option value="FR">France</option>
              <option value="ES">Spain</option>
              <option value="PT">Portugal</option>
            </select>
          </div>

          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.accepting_members}
              onChange={(e) => handleFilterChange('accepting_members', e.target.checked)}
            />
            Accepting members
          </label>

          {(filters.q || filters.country || filters.accepting_members) && (
            <button onClick={clearFilters} className="clear-filters">
              Clear filters
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading collectives...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchCollectives} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="results-count">
              Showing {collectives.length} collectives
            </div>
            
            <div className="collectives-grid">
              {collectives.map((collective) => (
                <Link 
                  to={`/collectives/${collective.slug}`} 
                  key={collective.id}
                  className="collective-card-large"
                >
                  <div className="collective-card-image-large">
                    {collective.cover_image_url ? (
                      <img src={collective.cover_image_url} alt={collective.name} />
                    ) : (
                      <div className="placeholder-image-large">
                        🏠
                      </div>
                    )}
                    {collective.accepting_members && (
                      <span className="badge badge-success">Accepting Members</span>
                    )}
                  </div>
                  <div className="collective-card-body">
                    <h3>{collective.name}</h3>
                    <p className="collective-location">
                      📍 {collective.location.city}, {collective.location.country}
                    </p>
                    <p className="collective-description">
                      {collective.description}
                    </p>
                    <div className="collective-footer">
                      <span className="collective-members">
                        👥 {collective.member_count}/{collective.capacity} members
                      </span>
                      <span className="collective-founded">
                        Since {new Date(collective.founded_at).getFullYear()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.has_more && (
              <div className="load-more">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectivesPage;
