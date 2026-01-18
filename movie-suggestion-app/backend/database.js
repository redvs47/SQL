const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'movie_app.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Groups table with new fields
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        invite_code TEXT UNIQUE,
        default_watch_model TEXT DEFAULT 'solo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Group members table
    db.run(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(group_id, user_id)
      )
    `);

    // Pending members table
    db.run(`
      CREATE TABLE IF NOT EXISTS pending_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Movie sessions table with new fields
    db.run(`
      CREATE TABLE IF NOT EXISTS movie_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        status TEXT DEFAULT 'collecting_suggestions',
        selected_movie_id INTEGER,
        watch_date TEXT,
        watch_model TEXT DEFAULT 'solo',
        deadline_duration INTEGER DEFAULT 7,
        deadline_date TEXT,
        scheduled_watch_time TEXT,
        chat_unlocked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (selected_movie_id) REFERENCES movie_suggestions(id)
      )
    `);

    // Movie suggestions table with TMDB fields
    db.run(`
      CREATE TABLE IF NOT EXISTS movie_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        movie_title TEXT NOT NULL,
        tmdb_id INTEGER,
        poster_path TEXT,
        release_year TEXT,
        vote_average REAL,
        overview TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Video reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS video_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        video_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Chat messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message_type TEXT NOT NULL,
        content TEXT,
        video_path TEXT,
        is_review INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // User watch status table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_watch_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        has_watched INTEGER DEFAULT 0,
        personal_watch_date TEXT,
        marked_at DATETIME,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(session_id, user_id)
      )
    `);

    // Time vote slots table
    db.run(`
      CREATE TABLE IF NOT EXISTS time_vote_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        proposed_time TEXT NOT NULL,
        vote_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id)
      )
    `);

    // Time votes table
    db.run(`
      CREATE TABLE IF NOT EXISTS time_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES time_vote_slots(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(slot_id, user_id)
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        session_id INTEGER,
        group_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES movie_sessions(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Notification preferences table
    db.run(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, notification_type)
      )
    `);

    // Group mutes table
    db.run(`
      CREATE TABLE IF NOT EXISTS group_mutes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        muted INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        UNIQUE(user_id, group_id)
      )
    `);

    console.log('Database tables initialized');
  });
}

// Migration helper function
function runMigrations() {
  db.serialize(() => {
    // Add columns to existing tables if they don't exist
    const migrations = [
      // Groups table migrations
      `ALTER TABLE groups ADD COLUMN invite_code TEXT`,
      `ALTER TABLE groups ADD COLUMN default_watch_model TEXT DEFAULT 'solo'`,

      // Movie sessions table migrations
      `ALTER TABLE movie_sessions ADD COLUMN watch_model TEXT DEFAULT 'solo'`,
      `ALTER TABLE movie_sessions ADD COLUMN deadline_duration INTEGER DEFAULT 7`,
      `ALTER TABLE movie_sessions ADD COLUMN deadline_date TEXT`,
      `ALTER TABLE movie_sessions ADD COLUMN scheduled_watch_time TEXT`,
      `ALTER TABLE movie_sessions ADD COLUMN chat_unlocked INTEGER DEFAULT 0`,

      // Movie suggestions table migrations
      `ALTER TABLE movie_suggestions ADD COLUMN tmdb_id INTEGER`,
      `ALTER TABLE movie_suggestions ADD COLUMN poster_path TEXT`,
      `ALTER TABLE movie_suggestions ADD COLUMN release_year TEXT`,
      `ALTER TABLE movie_suggestions ADD COLUMN vote_average REAL`,
      `ALTER TABLE movie_suggestions ADD COLUMN overview TEXT`,
    ];

    migrations.forEach(migration => {
      db.run(migration, (err) => {
        // Ignore errors for columns that already exist
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Migration error:', err.message);
        }
      });
    });
  });
}

// Run migrations after initialization
setTimeout(() => {
  runMigrations();
}, 1000);

module.exports = db;
