require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const { authenticateToken } = require('./middleware/auth');
const tmdbService = require('./services/tmdbService');
const notificationService = require('./services/notificationService');
const calendarService = require('./services/calendarService');

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
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
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

// Helper function to generate invite code
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Movie Suggestion App API', version: '1.0.0' });
});

// ==================== AUTH ROUTES ====================

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

// ==================== TMDB ROUTES ====================

app.get('/api/tmdb/search', authenticateToken, async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const results = await tmdbService.searchMovies(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tmdb/movie/:tmdbId', authenticateToken, async (req, res) => {
  const { tmdbId } = req.params;

  try {
    const details = await tmdbService.getMovieDetails(tmdbId);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tmdb/movie/:tmdbId/providers', authenticateToken, async (req, res) => {
  const { tmdbId } = req.params;
  const { region } = req.query;

  try {
    const providers = await tmdbService.getWatchProviders(tmdbId, region || 'US');
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GROUP ROUTES ====================

app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, watchModel } = req.body;
  const userId = req.user.id;

  const inviteCode = generateInviteCode();
  const defaultWatchModel = watchModel || 'solo';

  db.run(
    'INSERT INTO groups (name, created_by, invite_code, default_watch_model) VALUES (?, ?, ?, ?)',
    [name, userId, inviteCode, defaultWatchModel],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const groupId = this.lastID;

      db.run(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({
            id: groupId,
            name,
            invite_code: inviteCode,
            default_watch_model: defaultWatchModel,
            message: 'Group created successfully'
          });
        }
      );
    }
  );
});

app.get('/api/groups', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT g.*,
     (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM groups g
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

app.get('/api/groups/:groupId', authenticateToken, (req, res) => {
  const { groupId } = req.params;

  db.get(
    'SELECT * FROM groups WHERE id = ?',
    [groupId],
    (err, group) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    }
  );
});

app.post('/api/groups/join/:inviteCode', authenticateToken, (req, res) => {
  const { inviteCode } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM groups WHERE invite_code = ?', [inviteCode], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    db.get(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
      [group.id, userId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existing) {
          return res.status(400).json({ error: 'Already a member of this group' });
        }

        // Add to pending members
        db.run(
          'INSERT INTO pending_members (group_id, user_id, status) VALUES (?, ?, ?)',
          [group.id, userId, 'pending'],
          async (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Notify leader
            await notificationService.notifyPendingMember(group.id, req.user.username);

            res.json({ message: 'Join request sent. Waiting for approval.', groupName: group.name });
          }
        );
      }
    );
  });
});

app.get('/api/groups/:groupId/members', authenticateToken, (req, res) => {
  const { groupId } = req.params;

  db.all(
    `SELECT u.id, u.username, u.email, gm.joined_at,
     (g.created_by = u.id) as is_leader
     FROM group_members gm
     INNER JOIN users u ON gm.user_id = u.id
     INNER JOIN groups g ON gm.group_id = g.id
     WHERE gm.group_id = ?`,
    [groupId],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(members);
    }
  );
});

// ==================== PENDING MEMBERS ROUTES ====================

app.get('/api/groups/:groupId/pending', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  // Verify user is the group leader
  db.get('SELECT created_by FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group || group.created_by !== userId) {
      return res.status(403).json({ error: 'Only group leader can view pending members' });
    }

    db.all(
      `SELECT pm.id, pm.status, pm.created_at, u.id as user_id, u.username, u.email
       FROM pending_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.group_id = ? AND pm.status = 'pending'`,
      [groupId],
      (err, pending) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(pending);
      }
    );
  });
});

app.post('/api/groups/:groupId/pending/:pendingId/approve', authenticateToken, (req, res) => {
  const { groupId, pendingId } = req.params;
  const userId = req.user.id;

  // Verify user is the group leader
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group || group.created_by !== userId) {
      return res.status(403).json({ error: 'Only group leader can approve members' });
    }

    db.get('SELECT * FROM pending_members WHERE id = ?', [pendingId], (err, pending) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!pending) {
        return res.status(404).json({ error: 'Pending member not found' });
      }

      // Add to group members
      db.run(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, pending.user_id],
        async (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Update pending status
          db.run(
            'UPDATE pending_members SET status = ? WHERE id = ?',
            ['approved', pendingId],
            async (err) => {
              if (err) {
                console.error('Error updating pending status:', err);
              }

              // Send notifications
              await notificationService.notifyMemberApproved(pending.user_id, groupId, group.name);

              res.json({ message: 'Member approved successfully' });
            }
          );
        }
      );
    });
  });
});

app.post('/api/groups/:groupId/pending/:pendingId/deny', authenticateToken, (req, res) => {
  const { groupId, pendingId } = req.params;
  const userId = req.user.id;

  // Verify user is the group leader
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group || group.created_by !== userId) {
      return res.status(403).json({ error: 'Only group leader can deny members' });
    }

    db.get('SELECT * FROM pending_members WHERE id = ?', [pendingId], (err, pending) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!pending) {
        return res.status(404).json({ error: 'Pending member not found' });
      }

      db.run(
        'UPDATE pending_members SET status = ? WHERE id = ?',
        ['denied', pendingId],
        async (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Send notification
          await notificationService.notifyMemberDenied(pending.user_id, group.name);

          res.json({ message: 'Member denied' });
        }
      );
    });
  });
});

// ==================== MOVIE SESSION ROUTES ====================

app.post('/api/sessions', authenticateToken, (req, res) => {
  const { groupId, watchModel, deadlineDuration } = req.body;
  const userId = req.user.id;

  // Verify user is in group and get group info
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

      // Get group to check default watch model
      db.get('SELECT default_watch_model FROM groups WHERE id = ?', [groupId], (err, group) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const sessionWatchModel = watchModel || group.default_watch_model || 'solo';
        const sessionDeadlineDuration = deadlineDuration || 7;

        db.run(
          'INSERT INTO movie_sessions (group_id, watch_model, deadline_duration) VALUES (?, ?, ?)',
          [groupId, sessionWatchModel, sessionDeadlineDuration],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
              id: this.lastID,
              watch_model: sessionWatchModel,
              message: 'Session created successfully'
            });
          }
        );
      });
    }
  );
});

app.get('/api/groups/:groupId/active-session', authenticateToken, (req, res) => {
  const { groupId } = req.params;

  db.get(
    `SELECT ms.*, msug.movie_title as selected_movie_title
     FROM movie_sessions ms
     LEFT JOIN movie_suggestions msug ON ms.selected_movie_id = msug.id
     WHERE ms.group_id = ? AND ms.status != 'closed'
     ORDER BY ms.created_at DESC LIMIT 1`,
    [groupId],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(session || null);
    }
  );
});

app.get('/api/sessions/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.get(
    `SELECT ms.*, msug.movie_title as selected_movie_title,
     msug.poster_path, msug.tmdb_id
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

// ==================== MOVIE SUGGESTIONS ROUTES ====================

app.post('/api/sessions/:sessionId/suggestions', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { movieTitle, tmdbId, posterPath, releaseYear, voteAverage, overview } = req.body;
  const userId = req.user.id;

  if (!movieTitle || !tmdbId) {
    return res.status(400).json({ error: 'Movie title and TMDB ID are required' });
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
        `INSERT INTO movie_suggestions
        (session_id, user_id, movie_title, tmdb_id, poster_path, release_year, vote_average, overview)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, movieTitle, tmdbId, posterPath, releaseYear, voteAverage, overview],
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

app.post('/api/sessions/:sessionId/select-movie', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;

  db.all(
    'SELECT * FROM movie_suggestions WHERE session_id = ?',
    [sessionId],
    async (err, suggestions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (suggestions.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 suggestions to select a movie' });
      }

      // Randomly select a movie
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      const selectedMovie = suggestions[randomIndex];

      // Get session info for watch model
      db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Calculate deadline date (from selection time)
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + (session.deadline_duration || 7));
        const deadlineDateStr = deadlineDate.toISOString();

        db.run(
          'UPDATE movie_sessions SET status = ?, selected_movie_id = ?, deadline_date = ? WHERE id = ?',
          ['movie_selected', selectedMovie.id, deadlineDateStr, sessionId],
          async (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Send notification
            await notificationService.notifyMovieSelected(sessionId, session.group_id, selectedMovie.movie_title);

            // If party mode, start voting
            if (session.watch_model === 'party') {
              await notificationService.notifyVotingOpened(sessionId, session.group_id, selectedMovie.movie_title);
            }

            res.json({
              message: 'Movie selected successfully',
              selectedMovie: selectedMovie.movie_title,
              tmdbId: selectedMovie.tmdb_id
            });
          }
        );
      });
    }
  );
});

// ==================== WATCH STATUS ROUTES ====================

app.get('/api/sessions/:sessionId/watch-status', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.all(
    `SELECT ws.*, u.username
     FROM user_watch_status ws
     INNER JOIN users u ON ws.user_id = u.id
     WHERE ws.session_id = ?`,
    [sessionId],
    (err, statuses) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(statuses);
    }
  );
});

app.post('/api/sessions/:sessionId/mark-watched', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Get session info
  db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get movie title
    db.get('SELECT movie_title FROM movie_suggestions WHERE id = ?', [session.selected_movie_id], async (err, movie) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run(
        `INSERT OR REPLACE INTO user_watch_status
        (session_id, user_id, has_watched, marked_at)
        VALUES (?, ?, 1, datetime('now'))`,
        [sessionId, userId],
        async (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Send notification
          await notificationService.notifyUserWatched(
            sessionId,
            session.group_id,
            userId,
            req.user.username,
            movie ? movie.movie_title : 'the movie'
          );

          res.json({ message: 'Marked as watched' });
        }
      );
    });
  });
});

app.post('/api/sessions/:sessionId/watch-date', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { watchDate } = req.body;
  const userId = req.user.id;

  if (!watchDate) {
    return res.status(400).json({ error: 'Watch date is required' });
  }

  db.run(
    `INSERT OR REPLACE INTO user_watch_status
    (session_id, user_id, personal_watch_date)
    VALUES (?, ?, ?)`,
    [sessionId, userId, watchDate],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Watch date set successfully' });
    }
  );
});

// ==================== PARTY MODE VOTING ROUTES ====================

app.post('/api/sessions/:sessionId/vote-slots', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { proposedTimes } = req.body;

  if (!Array.isArray(proposedTimes) || proposedTimes.length === 0) {
    return res.status(400).json({ error: 'At least one time slot is required' });
  }

  const insertPromises = proposedTimes.map(time => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO time_vote_slots (session_id, proposed_time) VALUES (?, ?)',
        [sessionId, time],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  });

  Promise.all(insertPromises)
    .then(() => res.json({ message: 'Time slots created' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/sessions/:sessionId/vote-slots', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.all(
    'SELECT * FROM time_vote_slots WHERE session_id = ? ORDER BY vote_count DESC',
    [sessionId],
    (err, slots) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(slots);
    }
  );
});

app.post('/api/sessions/:sessionId/vote', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { slotIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(slotIds) || slotIds.length === 0) {
    return res.status(400).json({ error: 'At least one time slot must be selected' });
  }

  // Delete existing votes
  db.run(
    `DELETE FROM time_votes WHERE slot_id IN
    (SELECT id FROM time_vote_slots WHERE session_id = ?) AND user_id = ?`,
    [sessionId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Insert new votes
      const insertPromises = slotIds.map(slotId => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO time_votes (slot_id, user_id) VALUES (?, ?)',
            [slotId, userId],
            (err) => {
              if (err) reject(err);
              else {
                // Update vote count
                db.run(
                  'UPDATE time_vote_slots SET vote_count = vote_count + 1 WHERE id = ?',
                  [slotId],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              }
            }
          );
        });
      });

      Promise.all(insertPromises)
        .then(() => res.json({ message: 'Votes recorded' }))
        .catch(err => res.status(500).json({ error: err.message }));
    }
  );
});

app.post('/api/sessions/:sessionId/finalize-vote', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;

  // Get the winning time slot
  db.get(
    'SELECT * FROM time_vote_slots WHERE session_id = ? ORDER BY vote_count DESC LIMIT 1',
    [sessionId],
    async (err, winningSlot) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!winningSlot) {
        return res.status(400).json({ error: 'No votes found' });
      }

      // Get session info
      db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Update session with scheduled watch time
        db.run(
          'UPDATE movie_sessions SET scheduled_watch_time = ?, watch_date = ?, status = ? WHERE id = ?',
          [winningSlot.proposed_time, winningSlot.proposed_time, 'watching', sessionId],
          async (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Send notification
            await notificationService.notifyWatchTimeSelected(
              sessionId,
              session.group_id,
              winningSlot.proposed_time
            );

            res.json({
              message: 'Watch time finalized',
              watchTime: winningSlot.proposed_time
            });
          }
        );
      });
    }
  );
});

// ==================== REVIEW ROUTES ====================

app.post('/api/sessions/:sessionId/reviews', authenticateToken, upload.single('video'), async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const videoPath = `/uploads/videos/${req.file.filename}`;

  // Get session info
  db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get movie title
    db.get('SELECT movie_title FROM movie_suggestions WHERE id = ?', [session.selected_movie_id], async (err, movie) => {
      if (err) {
        console.error('Error getting movie:', err);
      }

      db.run(
        'INSERT INTO video_reviews (session_id, user_id, video_path) VALUES (?, ?, ?)',
        [sessionId, userId, videoPath],
        async function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const reviewId = this.lastID;

          // Auto-post review to chat
          db.run(
            'INSERT INTO chat_messages (session_id, user_id, message_type, video_path, is_review) VALUES (?, ?, ?, ?, ?)',
            [sessionId, userId, 'video', videoPath, 1],
            async (err) => {
              if (err) {
                console.error('Error posting review to chat:', err);
              }

              // Mark as watched
              db.run(
                `INSERT OR REPLACE INTO user_watch_status
                (session_id, user_id, has_watched, marked_at)
                VALUES (?, ?, 1, datetime('now'))`,
                [sessionId, userId],
                async (err) => {
                  if (err) {
                    console.error('Error marking as watched:', err);
                  }

                  // Update session status
                  db.run(
                    'UPDATE movie_sessions SET status = ? WHERE id = ?',
                    ['reviewed', sessionId],
                    async (err) => {
                      if (err) {
                        console.error('Error updating session status:', err);
                      }

                      // Send notification
                      await notificationService.notifyReviewSubmitted(
                        sessionId,
                        session.group_id,
                        userId,
                        req.user.username,
                        movie ? movie.movie_title : 'the movie'
                      );

                      res.status(201).json({
                        id: reviewId,
                        videoPath,
                        message: 'Review submitted successfully'
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
});

app.get('/api/sessions/:sessionId/reviews', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Check if user has submitted their review
  db.get(
    'SELECT * FROM video_reviews WHERE session_id = ? AND user_id = ?',
    [sessionId, userId],
    (err, userReview) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // If user hasn't submitted review, return locked status
      if (!userReview) {
        return res.json({ locked: true, reviews: [] });
      }

      // User has submitted, return all reviews
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
          res.json({ locked: false, reviews });
        }
      );
    }
  );
});

// ==================== CHAT MESSAGES ROUTES ====================

app.get('/api/sessions/:sessionId/chat', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Check if user has submitted their review
  db.get(
    'SELECT * FROM video_reviews WHERE session_id = ? AND user_id = ?',
    [sessionId, userId],
    (err, userReview) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // If user hasn't submitted review, return locked status
      if (!userReview) {
        return res.json({ locked: true, messages: [] });
      }

      // User has submitted, return all chat messages
      db.all(
        `SELECT cm.*, u.username
         FROM chat_messages cm
         INNER JOIN users u ON cm.user_id = u.id
         WHERE cm.session_id = ?
         ORDER BY cm.created_at ASC`,
        [sessionId],
        (err, messages) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ locked: false, messages });
        }
      );
    }
  );
});

app.post('/api/sessions/:sessionId/chat', authenticateToken, upload.single('video'), async (req, res) => {
  const { sessionId } = req.params;
  const { content, messageType } = req.body;
  const userId = req.user.id;

  // Check if user has submitted their review first
  db.get(
    'SELECT * FROM video_reviews WHERE session_id = ? AND user_id = ?',
    [sessionId, userId],
    async (err, userReview) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!userReview) {
        return res.status(403).json({ error: 'Must submit review before posting in chat' });
      }

      const videoPath = req.file ? `/uploads/videos/${req.file.filename}` : null;
      const msgType = req.file ? 'video' : 'text';

      // Get session info
      db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.run(
          'INSERT INTO chat_messages (session_id, user_id, message_type, content, video_path) VALUES (?, ?, ?, ?, ?)',
          [sessionId, userId, msgType, content, videoPath],
          async function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Send notification
            await notificationService.notifyChatMessage(
              sessionId,
              session.group_id,
              userId,
              req.user.username,
              msgType
            );

            res.status(201).json({
              id: this.lastID,
              message: 'Message posted successfully'
            });
          }
        );
      });
    }
  );
});

// ==================== NOTIFICATIONS ROUTES ====================

app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId],
    (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(notifications);
    }
  );
});

app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ count: result.count });
    }
  );
});

app.post('/api/notifications/:notificationId/read', authenticateToken, (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Notification marked as read' });
    }
  );
});

app.post('/api/notifications/read-all', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'All notifications marked as read' });
    }
  );
});

// Notification preferences
app.get('/api/notification-preferences', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    'SELECT * FROM notification_preferences WHERE user_id = ?',
    [userId],
    (err, prefs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(prefs);
    }
  );
});

app.post('/api/notification-preferences', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { notificationType, enabled } = req.body;

  db.run(
    `INSERT OR REPLACE INTO notification_preferences (user_id, notification_type, enabled)
     VALUES (?, ?, ?)`,
    [userId, notificationType, enabled ? 1 : 0],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Preference updated' });
    }
  );
});

// Group mute
app.post('/api/groups/:groupId/mute', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const { muted } = req.body;

  db.run(
    `INSERT OR REPLACE INTO group_mutes (user_id, group_id, muted)
     VALUES (?, ?, ?)`,
    [userId, groupId, muted ? 1 : 0],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: muted ? 'Group muted' : 'Group unmuted' });
    }
  );
});

// ==================== LEADER ACTIONS ====================

app.post('/api/sessions/:sessionId/extend-deadline', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { days } = req.body;
  const userId = req.user.id;

  // Get session
  db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Verify user is leader
    db.get('SELECT created_by FROM groups WHERE id = ?', [session.group_id], async (err, group) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (group.created_by !== userId) {
        return res.status(403).json({ error: 'Only group leader can extend deadline' });
      }

      // Calculate new deadline
      const currentDeadline = new Date(session.deadline_date);
      currentDeadline.setDate(currentDeadline.getDate() + days);
      const newDeadlineStr = currentDeadline.toISOString();

      db.run(
        'UPDATE movie_sessions SET deadline_date = ?, deadline_duration = deadline_duration + ? WHERE id = ?',
        [newDeadlineStr, days, sessionId],
        async (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Send notification
          await notificationService.notifyDeadlineExtended(
            sessionId,
            session.group_id,
            newDeadlineStr
          );

          res.json({ message: 'Deadline extended', newDeadline: newDeadlineStr });
        }
      );
    });
  });
});

app.post('/api/sessions/:sessionId/close', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  // Get session
  db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], async (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get movie title
    db.get('SELECT movie_title FROM movie_suggestions WHERE id = ?', [session.selected_movie_id], async (err, movie) => {
      if (err) {
        console.error('Error getting movie:', err);
      }

      // Verify user is leader
      db.get('SELECT created_by FROM groups WHERE id = ?', [session.group_id], async (err, group) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (group.created_by !== userId) {
          return res.status(403).json({ error: 'Only group leader can close session' });
        }

        db.run(
          'UPDATE movie_sessions SET status = ? WHERE id = ?',
          ['closed', sessionId],
          async (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Send notification
            await notificationService.notifySessionClosed(
              sessionId,
              session.group_id,
              movie ? movie.movie_title : 'the movie'
            );

            res.json({ message: 'Session closed' });
          }
        );
      });
    });
  });
});

// ==================== CALENDAR INTEGRATION ROUTES ====================

// Download ICS file for calendar import
app.get('/api/sessions/:sessionId/calendar.ics', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    // Get session
    const session = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Prepare event data
    const eventData = await calendarService.prepareEventData(session, userId);

    // Generate ICS content
    const icsContent = calendarService.generateICS(eventData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="watch-${eventData.movieTitle.replace(/[^a-z0-9]/gi, '-')}.ics"`);

    res.send(icsContent);
  } catch (error) {
    console.error('Error generating ICS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Google Calendar URL
app.get('/api/sessions/:sessionId/calendar/google-url', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    // Get session
    const session = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM movie_sessions WHERE id = ?', [sessionId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Prepare event data
    const eventData = await calendarService.prepareEventData(session, userId);

    // Generate Google Calendar URL
    const googleUrl = calendarService.generateGoogleCalendarUrl(eventData);

    res.json({ url: googleUrl });
  } catch (error) {
    console.error('Error generating Google Calendar URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Apple Calendar webcal URL
app.get('/api/sessions/:sessionId/calendar/apple-url', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const appleUrl = calendarService.generateAppleCalendarUrl(sessionId);
    res.json({ url: appleUrl });
  } catch (error) {
    console.error('Error generating Apple Calendar URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
