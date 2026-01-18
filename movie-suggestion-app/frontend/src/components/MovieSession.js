import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function MovieSession({ user }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Session state
  const [session, setSession] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [watchStatus, setWatchStatus] = useState([]);
  const [chat, setChat] = useState([]);

  // TMDB search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searching, setSearching] = useState(false);

  // Form state
  const [watchDate, setWatchDate] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatVideoFile, setChatVideoFile] = useState(null);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('session'); // session, chat, calendar

  const chatEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadSession();
    loadSuggestions();
    loadReviews();
    loadWatchStatus();
    loadChat();
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadSession();
      loadSuggestions();
      loadChat();
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);

  const loadSession = async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}`);
      setSession(response.data);
    } catch (err) {
      setError('Failed to load session');
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}/suggestions`);
      setSuggestions(response.data);
    } catch (err) {
      console.error('Failed to load suggestions');
    }
  };

  const loadReviews = async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}/reviews`);
      setReviews(response.data);
    } catch (err) {
      console.error('Failed to load reviews');
    }
  };

  const loadWatchStatus = async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}/watch-status`);
      setWatchStatus(response.data);
    } catch (err) {
      console.error('Failed to load watch status');
    }
  };

  const loadChat = async () => {
    try {
      const response = await axios.get(`/api/sessions/${sessionId}/chat`);
      setChat(response.data);
    } catch (err) {
      console.error('Failed to load chat');
    }
  };

  // TMDB Search
  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await axios.get(`/api/tmdb/search?query=${encodeURIComponent(query)}`);
        setSearchResults(response.data);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectMovie = (movie) => {
    setSelectedMovie(movie);
    setSearchQuery(movie.title);
    setSearchResults([]);
  };

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMovie) {
      setError('Please select a movie from the search results');
      return;
    }

    try {
      await axios.post(`/api/sessions/${sessionId}/suggestions`, {
        tmdb_id: selectedMovie.tmdb_id,
        movie_title: selectedMovie.title
      });
      setSuccess('Movie suggestion submitted!');
      setSearchQuery('');
      setSelectedMovie(null);
      loadSuggestions();
      loadSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit suggestion');
    }
  };

  const handleSelectMovie = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`/api/sessions/${sessionId}/select-movie`);
      setSuccess(`Selected: ${response.data.selectedMovie}`);
      loadSession();
      loadSuggestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to select movie');
    }
  };

  const handleMarkWatched = async () => {
    setError('');
    setSuccess('');

    try {
      await axios.post(`/api/sessions/${sessionId}/mark-watched`, { watchDate });
      setSuccess('Marked as watched!');
      setWatchDate('');
      loadWatchStatus();
      loadSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as watched');
    }
  };

  const handleVideoUpload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;

      if (duration > 180) {
        setError('Video must be 3 minutes or less');
        return;
      }

      const formData = new FormData();
      formData.append('video', videoFile);

      setUploading(true);

      try {
        await axios.post(`/api/sessions/${sessionId}/reviews`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setSuccess('Review uploaded successfully!');
        setVideoFile(null);
        loadReviews();
        loadSession();
        loadChat();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to upload review');
      } finally {
        setUploading(false);
      }
    };

    video.src = URL.createObjectURL(videoFile);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    setError('');

    if (!chatMessage.trim() && !chatVideoFile) {
      return;
    }

    try {
      if (chatVideoFile) {
        // Upload video message
        const formData = new FormData();
        formData.append('video', chatVideoFile);
        if (chatMessage.trim()) {
          formData.append('message', chatMessage);
        }
        await axios.post(`/api/sessions/${sessionId}/chat`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setChatVideoFile(null);
      } else {
        // Send text message
        await axios.post(`/api/sessions/${sessionId}/chat`, {
          message: chatMessage
        });
      }
      setChatMessage('');
      loadChat();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You must submit a review before chatting');
      } else {
        setError(err.response?.data?.error || 'Failed to send message');
      }
    }
  };

  const getCalendarUrls = () => {
    return {
      google: `http://localhost:3001/api/sessions/${sessionId}/calendar/google-url`,
      apple: `http://localhost:3001/api/sessions/${sessionId}/calendar/apple-url`,
      ics: `http://localhost:3001/api/sessions/${sessionId}/calendar.ics`
    };
  };

  if (!session) {
    return <div className="loading">Loading session...</div>;
  }

  const userHasSuggested = suggestions.some(s => s.user_id === user.id);
  const userHasWatched = watchStatus.some(s => s.user_id === user.id);
  const userHasReviewed = reviews.some(r => r.user_id === user.id);
  const canSelectMovie = suggestions.length >= 2 && session.status === 'collecting_suggestions';
  const isLeader = session.created_by === user.id;

  return (
    <div className="container">
      <div className="nav">
        <div>
          <h2>Movie Session</h2>
        </div>
        <div className="nav-links">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'session' ? 'active' : ''}`}
          onClick={() => setActiveTab('session')}
        >
          Session
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat {!userHasReviewed && <span style={{fontSize: '10px'}}>(Review required)</span>}
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {/* Session Tab */}
      {activeTab === 'session' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Session Status</h2>
              <span className={`status-badge status-${session.status}`}>
                {session.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            {session.selected_movie_title && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
                <h3>Selected Movie: {session.selected_movie_title}</h3>
                {session.selected_movie_tmdb_id && (
                  <p style={{ marginTop: '5px', fontSize: '14px' }}>TMDB ID: {session.selected_movie_tmdb_id}</p>
                )}
                <div style={{ marginTop: '15px' }}>
                  <strong>Watch Status:</strong>
                  <p>{watchStatus.length} / {session.member_count} members have watched</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 1: Collect Suggestions */}
          {session.status === 'collecting_suggestions' && (
            <div className="card">
              <h2>Submit Your Movie Suggestion</h2>
              {!userHasSuggested ? (
                <form onSubmit={handleSubmitSuggestion}>
                  <div className="form-group">
                    <label>Search for a Movie</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Type to search movies..."
                      autoComplete="off"
                    />
                    {searching && <p style={{ fontSize: '14px', color: '#666' }}>Searching...</p>}
                    {searchResults.length > 0 && (
                      <div className="search-results">
                        {searchResults.map((movie) => (
                          <div
                            key={movie.tmdb_id}
                            className="search-result-item"
                            onClick={() => selectMovie(movie)}
                          >
                            {movie.poster_url && (
                              <img src={movie.poster_url} alt={movie.title} style={{ width: '50px', marginRight: '10px' }} />
                            )}
                            <div>
                              <strong>{movie.title}</strong> ({movie.release_year})
                              <p style={{ fontSize: '12px', color: '#666' }}>⭐ {movie.vote_average?.toFixed(1)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedMovie && (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', borderRadius: '4px' }}>
                        <strong>Selected:</strong> {selectedMovie.title} ({selectedMovie.release_year})
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!selectedMovie}>
                    Submit Suggestion
                  </button>
                </form>
              ) : (
                <div className="success">You have already submitted a suggestion!</div>
              )}

              <h3 style={{ marginTop: '30px' }}>Current Suggestions ({suggestions.length})</h3>
              {suggestions.length === 0 ? (
                <p style={{ color: '#666' }}>No suggestions yet. Be the first!</p>
              ) : (
                <ul className="suggestion-list">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id} className="suggestion-item">
                      <div>
                        <strong>{suggestion.movie_title}</strong>
                        <span style={{ marginLeft: '10px', color: '#666' }}>
                          by {suggestion.username}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {canSelectMovie && isLeader && (
                <div style={{ marginTop: '20px' }}>
                  <button onClick={handleSelectMovie} className="btn btn-success">
                    Randomly Select Movie
                  </button>
                </div>
              )}
              {canSelectMovie && !isLeader && (
                <p style={{ marginTop: '20px', color: '#666' }}>
                  Waiting for group leader to select the movie...
                </p>
              )}
            </div>
          )}

          {/* Step 2: Mark as Watched */}
          {session.selected_movie_title && !userHasWatched && (
            <div className="card">
              <h2>Mark as Watched</h2>
              <p>Have you watched "{session.selected_movie_title}"?</p>
              <div className="form-group">
                <label>When did you watch it?</label>
                <input
                  type="date"
                  value={watchDate}
                  onChange={(e) => setWatchDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <button onClick={handleMarkWatched} className="btn btn-primary">
                Mark as Watched
              </button>
            </div>
          )}

          {/* Step 3: Submit Review */}
          {userHasWatched && (
            <div className="card">
              <h2>Submit Your Video Review</h2>
              <p>Share your thoughts on "{session.selected_movie_title}"</p>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Record and upload a video review (maximum 3 minutes)
              </p>

              <form onSubmit={handleVideoUpload}>
                <div className="form-group">
                  <label>Upload Video Review</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                  />
                  {videoFile && (
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={uploading || !videoFile}
                >
                  {uploading ? 'Uploading...' : 'Upload Review'}
                </button>
              </form>

              <h3 style={{ marginTop: '40px' }}>Reviews from Group Members</h3>
              {reviews.length === 0 ? (
                <p style={{ color: '#666' }}>No reviews yet. Be the first to share!</p>
              ) : (
                <div className="video-grid">
                  {reviews.map((review) => (
                    <div key={review.id} className="video-card">
                      <video controls>
                        <source src={`http://localhost:3001${review.video_path}`} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="video-card-info">
                        <strong>{review.username}</strong>
                        <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="card">
          <h2>Group Chat</h2>
          {!userHasReviewed ? (
            <div className="error">You must submit a video review before accessing chat</div>
          ) : (
            <>
              <div className="chat-container">
                {chat.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666' }}>No messages yet</p>
                ) : (
                  chat.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chat-message ${msg.user_id === user.id ? 'own' : 'other'}`}
                    >
                      <div className="chat-user">{msg.username}</div>
                      {msg.message && <div className="chat-text">{msg.message}</div>}
                      {msg.video_path && (
                        <video controls style={{ maxWidth: '300px', borderRadius: '8px' }}>
                          <source src={`http://localhost:3001${msg.video_path}`} type="video/mp4" />
                        </video>
                      )}
                      <div className="chat-time">
                        {new Date(msg.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="chat-input-form">
                <div className="form-group">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                  />
                </div>
                <div className="form-group">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setChatVideoFile(e.target.files[0])}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="card">
          <h2>Add to Calendar</h2>
          {session.selected_movie_title ? (
            <>
              <p>Add "{session.selected_movie_title}" to your calendar</p>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a
                  href={getCalendarUrls().google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  📅 Add to Google Calendar
                </a>
                <a
                  href={getCalendarUrls().apple}
                  className="btn btn-primary"
                >
                  📅 Add to Apple Calendar
                </a>
                <a
                  href={getCalendarUrls().ics}
                  download
                  className="btn btn-secondary"
                >
                  📥 Download ICS File
                </a>
              </div>
            </>
          ) : (
            <p style={{ color: '#666' }}>A movie must be selected first</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MovieSession;
