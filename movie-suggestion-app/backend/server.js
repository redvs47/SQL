require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/videos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed'));
  }
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        const token = jwt.sign(
          { id: this.lastID, username, email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: this.lastID, username, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// ==================== GROUP ROUTES ====================

// Create group
app.post('/api/groups', authenticateToken, (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  db.run(
    'INSERT INTO groups (name, created_by) VALUES (?, ?)',
    [name, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const groupId = this.lastID;

      // Add creator to group
      db.run(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ id: groupId, name, message: 'Group created successfully' });
        }
      );
    }
  );
});

// Get user's groups
app.get('/api/groups', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT g.* FROM groups g
     INNER JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?`,
    [userId],
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(groups);
    }
  );
});

// Join group
app.post('/api/groups/:groupId/join', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  db.run(
    'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
    [groupId, userId],
    (err) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Already a member of this group' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Joined group successfully' });
    }
  );
});

// ==================== MOVIE SESSION ROUTES ====================

// Create new movie session
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { groupId } = req.body;
  const userId = req.user.id;

  // Verify user is in group
  db.get(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId],
    (err, member) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }

      db.run(
        'INSERT INTO movie_sessions (group_id) VALUES (?)',
        [groupId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ id: this.lastID, message: 'Session created successfully' });
        }
      );
    }
  );
});

// Get active session for group
app.get('/api/groups/:groupId/active-session', authenticateToken, (req, res) => {
  const { groupId } = req.params;

  db.get(
    `SELECT * FROM movie_sessions
     WHERE group_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [groupId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(session || null);
    }
  );
});

// Submit movie suggestion
app.post('/api/sessions/:sessionId/suggestions', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { movieTitle } = req.body;
  const userId = req.user.id;

  if (!movieTitle) {
    return res.status(400).json({ error: 'Movie title is required' });
  }

  // Check if user already submitted a suggestion
  db.get(
    'SELECT * FROM movie_suggestions WHERE session_id = ? AND user_id = ?',
    [sessionId, userId],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (existing) {
        return res.status(400).json({ error: 'You have already submitted a suggestion for this session' });
      }

      db.run(
        'INSERT INTO movie_suggestions (session_id, user_id, movie_title) VALUES (?, ?, ?)',
        [sessionId, userId, movieTitle],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ id: this.lastID, message: 'Suggestion submitted successfully' });
        }
      );
    }
  );
});

// Get suggestions for session
app.get('/api/sessions/:sessionId/suggestions', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT ms.*, u.username
     FROM movie_suggestions ms
     INNER JOIN users u ON ms.user_id = u.id
     WHERE ms.session_id = ?`,
    [sessionId],
    (err, suggestions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(suggestions);
    }
  );
});

// Select random movie (when 2+ suggestions)
app.post('/api/sessions/:sessionId/select-movie', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.all(
    'SELECT * FROM movie_suggestions WHERE session_id = ?',
    [sessionId],
    (err, suggestions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (suggestions.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 suggestions to select a movie' });
      }

      // Randomly select a movie
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      const selectedMovie = suggestions[randomIndex];

      db.run(
        'UPDATE movie_sessions SET status = ?, selected_movie_id = ? WHERE id = ?',
        ['movie_selected', selectedMovie.id, sessionId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({
            message: 'Movie selected successfully',
            selectedMovie: selectedMovie.movie_title
          });
        }
      );
    }
  );
});

// Set watch date
app.post('/api/sessions/:sessionId/watch-date', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { watchDate } = req.body;

  if (!watchDate) {
    return res.status(400).json({ error: 'Watch date is required' });
  }

  db.run(
    'UPDATE movie_sessions SET watch_date = ?, status = ? WHERE id = ?',
    [watchDate, 'watching', sessionId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Watch date set successfully' });
    }
  );
});

// Submit video review
app.post('/api/sessions/:sessionId/reviews', authenticateToken, upload.single('video'), (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const videoPath = `/uploads/videos/${req.file.filename}`;

  db.run(
    'INSERT INTO video_reviews (session_id, user_id, video_path) VALUES (?, ?, ?)',
    [sessionId, userId, videoPath],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Update session status to reviewed
      db.run(
        'UPDATE movie_sessions SET status = ? WHERE id = ?',
        ['reviewed', sessionId],
        (err) => {
          if (err) {
            console.error('Error updating session status:', err);
          }
        }
      );

      res.status(201).json({
        id: this.lastID,
        videoPath,
        message: 'Review submitted successfully'
      });
    }
  );
});

// Get reviews for session
app.get('/api/sessions/:sessionId/reviews', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT vr.*, u.username
     FROM video_reviews vr
     INNER JOIN users u ON vr.user_id = u.id
     WHERE vr.session_id = ?`,
    [sessionId],
    (err, reviews) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(reviews);
    }
  );
});

// Get session details
app.get('/api/sessions/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.get(
    `SELECT ms.*, msug.movie_title as selected_movie_title
     FROM movie_sessions ms
     LEFT JOIN movie_suggestions msug ON ms.selected_movie_id = msug.id
     WHERE ms.id = ?`,
    [sessionId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    }
  );
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
