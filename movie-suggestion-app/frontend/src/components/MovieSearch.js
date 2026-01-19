import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function MovieSearch({ onSelectMovie, placeholder = "Search for a movie..." }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      // Debounce search requests
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        searchMovies(query);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const searchMovies = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
      setResults(response.data);
      setShowResults(true);
    } catch (err) {
      console.error('Failed to search movies:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = (movie) => {
    setQuery(movie.title);
    setShowResults(false);
    onSelectMovie(movie);
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxSizing: 'border-box'
        }}
      />

      {loading && (
        <div style={{
          position: 'absolute',
          right: '15px',
          top: '15px',
          fontSize: '14px',
          color: '#666'
        }}>
          Searching...
        </div>
      )}

      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginTop: '5px',
          maxHeight: '400px',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          {results.map((movie) => (
            <div
              key={movie.tmdb_id}
              onClick={() => handleSelectMovie(movie)}
              style={{
                display: 'flex',
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              {movie.poster_url && (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  style={{
                    width: '50px',
                    height: '75px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginRight: '12px'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '16px', marginBottom: '4px' }}>
                  {movie.title}
                  {movie.release_year && (
                    <span style={{ color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
                      ({movie.release_year})
                    </span>
                  )}
                </div>
                {movie.vote_average > 0 && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    ⭐ {movie.vote_average.toFixed(1)}/10
                  </div>
                )}
                {movie.overview && (
                  <p style={{
                    fontSize: '13px',
                    color: '#999',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {movie.overview}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && query.length >= 2 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginTop: '5px',
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          No movies found
        </div>
      )}
    </div>
  );
}

export default MovieSearch;
