# Map & Geolocation Integration
## European Housing Collectives Community

**Version:** 1.0  
**Map Provider:** Mapbox / Leaflet with OpenStreetMap  
**Geocoding:** Nominatim / Mapbox Geocoding API

---

## Overview

Interactive map features:
- Display collectives as map markers
- Search collectives by location
- Filter by radius/distance
- Geocode addresses to coordinates
- Privacy-aware location display

---

## Tech Stack

### Frontend
- **Map Library:** Leaflet.js (lightweight, open-source)
- **Tile Provider:** Mapbox / CartoDB Positron (clean, tech-hippie friendly)
- **Clustering:** Leaflet.markercluster
- **Geocoding:** Mapbox Geocoding API or Nominatim

### Backend
- **Database:** PostgreSQL with PostGIS extension
- **Spatial Queries:** PostGIS functions (ST_DWithin, ST_Distance)
- **Geocoding Service:** Mapbox Geocoding API (primary), Nominatim (fallback)

---

## Database Schema (PostGIS)

```sql
-- PostGIS is already enabled in schema.sql
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Key columns:
-- collectives.location: GEOGRAPHY(POINT, 4326)
-- users.current_location: GEOGRAPHY(POINT, 4326)
-- room_ads.location: GEOGRAPHY(POINT, 4326)
-- events.location: GEOGRAPHY(POINT, 4326)

-- Example spatial queries:

-- Find collectives within 50km of Berlin
SELECT * FROM collectives
WHERE ST_DWithin(
  location,
  ST_MakePoint(13.4050, 52.5200)::GEOGRAPHY,
  50000  -- meters
)
AND is_public = TRUE;

-- Calculate distance from user to each collective
SELECT 
  c.*,
  ST_Distance(c.location, u.current_location) / 1000 as distance_km
FROM collectives c
CROSS JOIN users u
WHERE u.id = 'user-uuid'
AND c.is_public = TRUE
ORDER BY distance_km;

-- Get collectives within bounding box (for map viewport)
SELECT * FROM collectives
WHERE ST_Within(
  location::GEOMETRY,
  ST_MakeEnvelope(
    13.0, 52.0,   -- minX, minY
    14.0, 53.0,   -- maxX, maxY
    4326
  )
);
```

---

## API Endpoints

### GET /collectives/map
Get collectives for map display.

**Query params:**
- `bounds` - Bounding box as `sw_lat,sw_lng,ne_lat,ne_lng`
- `zoom` - Current zoom level (affects clustering)
- `accepting_members` (boolean) - Filter
- `cluster` (boolean) - Return clustered data

**Response (200):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [13.4050, 52.5200]
      },
      "properties": {
        "id": "uuid",
        "slug": "sunshine-collective",
        "name": "Sunshine Collective",
        "member_count": 12,
        "accepting_members": true,
        "cover_image_url": "https://cdn.../cover.jpg",
        "cluster": false
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [13.4100, 52.5250]
      },
      "properties": {
        "cluster": true,
        "count": 5,
        "collective_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
      }
    }
  ]
}
```

### GET /collectives/nearby
Find collectives near a location.

**Query params:**
- `lat` (required) - Latitude
- `lng` (required) - Longitude
- `radius` - Search radius in km (default: 50, max: 500)
- `limit` - Max results (default: 20, max: 100)

**Response (200):**
```json
{
  "center": {
    "lat": 52.5200,
    "lng": 13.4050
  },
  "radius_km": 50,
  "total": 15,
  "data": [
    {
      "id": "uuid",
      "slug": "sunshine-collective",
      "name": "Sunshine Collective",
      "location": {
        "lat": 52.5150,
        "lng": 13.4100,
        "city": "Berlin",
        "country": "DE"
      },
      "member_count": 12,
      "accepting_members": true,
      "cover_image_url": "https://cdn...",
      "distance_km": 2.5
    }
  ]
}
```

### POST /geocode/forward
Convert address to coordinates.

**Request:**
```json
{
  "address": "Alexanderplatz 1, Berlin, Germany",
  "language": "en"
}
```

**Response (200):**
```json
{
  "results": [
    {
      "formatted_address": "Alexanderplatz 1, 10178 Berlin, Germany",
      "location": {
        "lat": 52.5219,
        "lng": 13.4132
      },
      "components": {
        "street": "Alexanderplatz",
        "number": "1",
        "city": "Berlin",
        "postcode": "10178",
        "country": "Germany",
        "country_code": "DE"
      },
      "accuracy": "rooftop"
    }
  ]
}
```

### POST /geocode/reverse
Convert coordinates to address.

**Request:**
```json
{
  "lat": 52.5200,
  "lng": 13.4050,
  "language": "en"
}
```

**Response (200):**
```json
{
  "results": [
    {
      "formatted_address": "Pariser Platz, 10117 Berlin, Germany",
      "location": {
        "lat": 52.5163,
        "lng": 13.3777
      },
      "components": {
        "street": "Pariser Platz",
        "city": "Berlin",
        "postcode": "10117",
        "country": "Germany",
        "country_code": "DE"
      }
    }
  ]
}
```

---

## Implementation

### Backend Service

```javascript
// services/GeolocationService.js
const axios = require('axios');

class GeolocationService {
  constructor() {
    this.mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    this.nominatimUrl = 'https://nominatim.openstreetmap.org';
    this.useMapbox = !!this.mapboxToken;
  }

  async forwardGeocode(address, options = {}) {
    const { language = 'en', limit = 5 } = options;

    if (this.useMapbox) {
      return this.mapboxForward(address, { language, limit });
    }
    return this.nominatimForward(address, { language, limit });
  }

  async reverseGeocode(lat, lng, options = {}) {
    const { language = 'en' } = options;

    if (this.useMapbox) {
      return this.mapboxReverse(lat, lng, { language });
    }
    return this.nominatimReverse(lat, lng, { language });
  }

  async mapboxForward(address, { language, limit }) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
    
    const response = await axios.get(url, {
      params: {
        access_token: this.mapboxToken,
        language,
        limit,
        types: 'address,place,locality,neighborhood'
      }
    });

    return response.data.features.map(feature => ({
      formatted_address: feature.place_name,
      location: {
        lat: feature.center[1],
        lng: feature.center[0]
      },
      components: this.parseMapboxComponents(feature.context),
      accuracy: feature.properties.accuracy || 'approximate'
    }));
  }

  async nominatimForward(address, { language, limit }) {
    const response = await axios.get(`${this.nominatimUrl}/search`, {
      params: {
        q: address,
        format: 'json',
        limit,
        'accept-language': language,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'HousingCollectives/1.0'
      }
    });

    return response.data.map(result => ({
      formatted_address: result.display_name,
      location: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      components: {
        street: result.address.road,
        number: result.address.house_number,
        city: result.address.city || result.address.town,
        postcode: result.address.postcode,
        country: result.address.country,
        country_code: result.address.country_code?.toUpperCase()
      },
      accuracy: result.importance > 0.5 ? 'rooftop' : 'approximate'
    }));
  }

  async mapboxReverse(lat, lng, { language }) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
    
    const response = await axios.get(url, {
      params: {
        access_token: this.mapboxToken,
        language,
        types: 'address,place,locality'
      }
    });

    const feature = response.data.features[0];
    if (!feature) return null;

    return {
      formatted_address: feature.place_name,
      location: {
        lat: feature.center[1],
        lng: feature.center[0]
      },
      components: this.parseMapboxComponents(feature.context)
    };
  }

  async nominatimReverse(lat, lng, { language }) {
    const response = await axios.get(`${this.nominatimUrl}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        'accept-language': language,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'HousingCollectives/1.0'
      }
    });

    const result = response.data;
    return {
      formatted_address: result.display_name,
      location: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      components: {
        street: result.address.road,
        number: result.address.house_number,
        city: result.address.city || result.address.town,
        postcode: result.address.postcode,
        country: result.address.country,
        country_code: result.address.country_code?.toUpperCase()
      }
    };
  }

  parseMapboxComponents(context) {
    const components = {};
    
    if (context) {
      context.forEach(item => {
        if (item.id.startsWith('country')) {
          components.country = item.text;
          components.country_code = item.short_code?.toUpperCase();
        } else if (item.id.startsWith('place')) {
          components.city = item.text;
        } else if (item.id.startsWith('postcode')) {
          components.postcode = item.text;
        } else if (item.id.startsWith('address')) {
          components.street = item.text;
        }
      });
    }

    return components;
  }
}

module.exports = GeolocationService;
```

### Database Queries

```javascript
// models/Collective.js - Spatial queries

class Collective {
  // Find within radius
  static async findNearby(lat, lng, radiusKm = 50, options = {}) {
    const { acceptingMembers, limit = 20, offset = 0 } = options;
    
    let query = `
      SELECT 
        c.*,
        ST_Distance(c.location, ST_MakePoint($2, $1)::GEOGRAPHY) / 1000 as distance_km
      FROM collectives c
      WHERE ST_DWithin(
        c.location,
        ST_MakePoint($2, $1)::GEOGRAPHY,
        $3 * 1000
      )
      AND c.is_public = TRUE
    `;
    
    const params = [lat, lng, radiusKm];
    let paramIdx = 4;
    
    if (acceptingMembers !== undefined) {
      query += ` AND c.accepting_members = $${paramIdx}`;
      params.push(acceptingMembers);
      paramIdx++;
    }
    
    query += ` ORDER BY distance_km LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
  }

  // Find within bounding box
  static async findInBounds(swLat, swLng, neLat, neLng, options = {}) {
    const { acceptingMembers } = options;
    
    let query = `
      SELECT 
        c.*,
        ST_X(c.location::GEOMETRY) as lng,
        ST_Y(c.location::GEOMETRY) as lat
      FROM collectives c
      WHERE ST_Within(
        c.location::GEOMETRY,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      AND c.is_public = TRUE
    `;
    
    const params = [swLng, swLat, neLng, neLat];
    
    if (acceptingMembers !== undefined) {
      query += ` AND c.accepting_members = $5`;
      params.push(acceptingMembers);
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }

  // Simple clustering for large datasets
  static async findClustered(swLat, swLng, neLat, neLng, zoom) {
    // Grid size based on zoom level
    const gridSize = this.getGridSize(zoom);
    
    const query = `
      SELECT 
        CASE 
          WHEN count(*) = 1 THEN jsonb_build_object(
            'cluster', false,
            'id', max(c.id),
            'slug', max(c.slug),
            'name', max(c.name),
            'member_count', max(c.current_residents),
            'accepting_members', max(c.accepting_members::int)::boolean,
            'cover_image_url', max(c.cover_image_url)
          )
          ELSE jsonb_build_object(
            'cluster', true,
            'count', count(*),
            'collective_ids', jsonb_agg(c.id)
          )
        END as properties,
        CASE 
          WHEN count(*) = 1 THEN ST_AsGeoJSON(c.location)::jsonb
          ELSE ST_AsGeoJSON(ST_Centroid(ST_Collect(c.location::GEOMETRY)))::jsonb
        END as geometry
      FROM collectives c
      WHERE c.is_public = TRUE
      AND ST_Within(
        c.location::GEOMETRY,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      GROUP BY 
        ST_SnapToGrid(c.location::GEOMETRY, $5)
    `;
    
    const result = await db.query(query, [swLng, swLat, neLng, neLat, gridSize]);
    
    return {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: row.properties
      }))
    };
  }

  static getGridSize(zoom) {
    // Approximate grid size in degrees
    const sizes = {
      1: 20, 2: 10, 3: 5, 4: 2, 5: 1,
      6: 0.5, 7: 0.25, 8: 0.1, 9: 0.05, 10: 0.025,
      11: 0.01, 12: 0.005, 13: 0.002, 14: 0.001, 15: 0.0005
    };
    return sizes[zoom] || 0.01;
  }
}

module.exports = Collective;
```

---

## Frontend Map Component

```javascript
// components/Map/CollectivesMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

const CollectivesMap = ({ 
  center = [52.5200, 13.4050], // Berlin default
  zoom = 10,
  onCollectiveSelect,
  filterAcceptingMembers = false
}) => {
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const [collectives, setCollectives] = useState([]);

  useEffect(() => {
    // Initialize map
    mapRef.current = L.map('map').setView(center, zoom);

    // Add tile layer (clean, minimal style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Initialize marker cluster group
    markersRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="cluster-icon">${count}</div>`,
          className: 'marker-cluster',
          iconSize: L.point(40, 40)
        });
      }
    });

    mapRef.current.addLayer(markersRef.current);

    // Load initial data
    loadCollectives();

    // Update on map move
    mapRef.current.on('moveend', loadCollectives);

    return () => {
      mapRef.current.remove();
    };
  }, []);

  const loadCollectives = async () => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    try {
      const response = await fetch(
        `/api/v1/collectives/map?` +
        `bounds=${sw.lat},${sw.lng},${ne.lat},${ne.lng}&` +
        `zoom=${mapRef.current.getZoom()}&` +
        `cluster=true&` +
        (filterAcceptingMembers ? 'accepting_members=true' : '')
      );

      const geojson = await response.json();
      updateMarkers(geojson.features);
    } catch (err) {
      console.error('Failed to load collectives:', err);
    }
  };

  const updateMarkers = (features) => {
    markersRef.current.clearLayers();

    features.forEach(feature => {
      const { geometry, properties } = feature;
      const [lng, lat] = geometry.coordinates;

      if (properties.cluster) {
        // Cluster marker
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div class="cluster-icon">${properties.count}</div>`,
            className: 'marker-cluster',
            iconSize: [40, 40]
          })
        });

        marker.on('click', () => {
          mapRef.current.flyTo([lat, lng], mapRef.current.getZoom() + 2);
        });

        markersRef.current.addLayer(marker);
      } else {
        // Individual collective marker
        const marker = L.marker([lat, lng], {
          icon: createCollectiveIcon(properties)
        });

        marker.bindPopup(createPopupContent(properties));
        marker.on('click', () => onCollectiveSelect?.(properties));

        markersRef.current.addLayer(marker);
      }
    });
  };

  const createCollectiveIcon = (collective) => {
    const acceptingClass = collective.accepting_members ? 'accepting' : 'full';
    
    return L.divIcon({
      html: `
        <div class="collective-marker ${acceptingClass}">
          <img src="${collective.cover_image_url || '/default-collective.png'}" alt="" />
          ${collective.accepting_members ? '<span class="badge">Open</span>' : ''}
        </div>
      `,
      className: 'collective-marker-container',
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50]
    });
  };

  const createPopupContent = (collective) => {
    return `
      <div class="collective-popup">
        <img src="${collective.cover_image_url}" alt="${collective.name}" />
        <h3>${collective.name}</h3>
        <p>${collective.member_count} members</p>
        ${collective.accepting_members 
          ? '<span class="badge accepting">Accepting members</span>' 
          : '<span class="badge full">Full</span>'}
        <a href="/collectives/${collective.slug}">View profile</a>
      </div>
    `;
  };

  return <div id="map" style={{ height: '100%', width: '100%' }} />;
};

export default CollectivesMap;
```

---

## Location Privacy

### Privacy Levels

| Level | Display | Use Case |
|-------|---------|----------|
| `exact` | Precise lat/lng | Public collectives |
| `city` | City center only | Private collectives, user location |
| `hidden` | Not shown | User opted out |

### Implementation

```javascript
// utils/locationPrivacy.js

function obfuscateLocation(lat, lng, level = 'city') {
  if (level === 'exact') {
    return { lat, lng };
  }
  
  if (level === 'city') {
    // Round to ~1km precision (0.01 degrees ≈ 1km)
    return {
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100
    };
  }
  
  return null;
}

// Apply in API response
function sanitizeCollectiveLocation(collective, viewerId) {
  const isMember = collective.members.some(m => m.id === viewerId);
  
  if (isMember) {
    return collective.location; // Exact for members
  }
  
  return obfuscateLocation(
    collective.location.lat,
    collective.location.lng,
    collective.privacy_level
  );
}
```

---

## Configuration

```javascript
// config/map.js
module.exports = {
  // Default center (Europe)
  defaultCenter: {
    lat: 51.1657,
    lng: 10.4515
  },
  defaultZoom: 5,
  
  // Tile providers
  tiles: {
    development: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    production: {
      url: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
      options: {
        id: 'mapbox/light-v11',
        accessToken: process.env.MAPBOX_ACCESS_TOKEN,
        attribution: '© Mapbox © OpenStreetMap'
      }
    }
  },
  
  // Search radius options
  radiusOptions: [10, 25, 50, 100, 250, 500],
  defaultRadius: 50,
  
  // Clustering
  clustering: {
    enabled: true,
    maxZoom: 14,
    radius: 50
  }
};
```

---

## API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Geocoding | 100 | per minute per IP |
| Map data | 1000 | per minute per IP |

Nominatim requires:
- Maximum 1 request per second
- User-Agent header with app info
- Attribution on map
