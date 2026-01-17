import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function MovieSession({ user }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [movieTitle, setMovieTitle] = useState('');
  const [watchDate, setWatchDate] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSession();
    loadSuggestions();
    loadReviews();
  }, [sessionId]);

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

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`/api/sessions/${sessionId}/suggestions`, { movieTitle });
      setSuccess('Movie suggestion submitted!');
      setMovieTitle('');
      loadSuggestions();
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to select movie');
    }
  };

  const handleSetWatchDate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`/api/sessions/${sessionId}/watch-date`, { watchDate });
      setSuccess('Watch date set!');
      loadSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set watch date');
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

    // Check video duration (client-side validation)
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;

      if (duration > 180) { // 3 minutes = 180 seconds
        setError('Video must be 3 minutes or less');
        return;
      }

      // Upload the video
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
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to upload review');
      } finally {
        setUploading(false);
      }
    };

    video.src = URL.createObjectURL(videoFile);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      collecting_suggestions: 'status-collecting',
      movie_selected: 'status-selected',
      watching: 'status-watching',
      reviewed: 'status-reviewed',
    };

    const statusLabels = {
      collecting_suggestions: 'Collecting Suggestions',
      movie_selected: 'Movie Selected',
      watching: 'Watching',
      reviewed: 'Reviewed',
    };

    return (
      <span className={`status-badge ${statusClasses[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  if (!session) {
    return <div className="loading">Loading session...</div>;
  }

  const userHasSuggested = suggestions.some(s => s.user_id === user.id);
  const canSelectMovie = suggestions.length >= 2 && session.status === 'collecting_suggestions';

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

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Session Status</h2>
          {getStatusBadge(session.status)}
        </div>

        {session.selected_movie_title && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
            <h3>Selected Movie: {session.selected_movie_title}</h3>
            {session.watch_date && (
              <p style={{ marginTop: '10px' }}>Watch Date: {session.watch_date}</p>
            )}
          </div>
        )}
      </div>

      {/* Step 1: Submit Movie Suggestions */}
      {session.status === 'collecting_suggestions' && (
        <div className="card">
          <h2>Submit Your Movie Suggestion</h2>
          {!userHasSuggested ? (
            <form onSubmit={handleSubmitSuggestion}>
              <div className="form-group">
                <label>Movie Title</label>
                <input
                  type="text"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="Enter a movie title"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Submit Suggestion</button>
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

          {canSelectMovie && (
            <div style={{ marginTop: '20px' }}>
              <button onClick={handleSelectMovie} className="btn btn-success">
                Randomly Select Movie
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Set Watch Date */}
      {session.status === 'movie_selected' && !session.watch_date && (
        <div className="card">
          <h2>Set Watch Date</h2>
          <p>The movie "{session.selected_movie_title}" has been selected!</p>
          <form onSubmit={handleSetWatchDate}>
            <div className="form-group">
              <label>When will you watch this movie?</label>
              <input
                type="date"
                value={watchDate}
                onChange={(e) => setWatchDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Set Watch Date</button>
          </form>
        </div>
      )}

      {/* Step 3: Submit Video Review */}
      {(session.status === 'watching' || session.status === 'reviewed') && (
        <div className="card">
          <h2>Submit Your Video Review</h2>
          <p>Have you finished watching "{session.selected_movie_title}"?</p>
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
                required
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
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Review'}
            </button>
          </form>

          {/* Show Reviews */}
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
    </div>
  );
}

export default MovieSession;
