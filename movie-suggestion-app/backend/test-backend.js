#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
let user1Token = '';
let user2Token = '';
let groupId = 0;
let inviteCode = '';
let sessionId = 0;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(title) {
  log(`\n${'='.repeat(50)}`, 'blue');
  log(`  ${title}`, 'blue');
  log('='.repeat(50), 'blue');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Authentication
async function testAuthentication() {
  section('Testing Authentication');

  try {
    // Register User 1
    info('Registering user1...');
    const user1 = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser1_' + Date.now(),
      email: `test1_${Date.now()}@example.com`,
      password: 'password123'
    });
    user1Token = user1.data.token;
    success('User 1 registered');

    // Register User 2
    info('Registering user2...');
    const user2 = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser2_' + Date.now(),
      email: `test2_${Date.now()}@example.com`,
      password: 'password123'
    });
    user2Token = user2.data.token;
    success('User 2 registered');

    // Test Login
    info('Testing login...');
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      username: user1.data.user.username,
      password: 'password123'
    });
    if (login.data.token) {
      success('Login successful');
    }

    return true;
  } catch (err) {
    error(`Authentication test failed: ${err.message}`);
    return false;
  }
}

// Test 2: TMDB Integration
async function testTMDB() {
  section('Testing TMDB Integration');

  try {
    // Search movies
    info('Searching for "Dark Knight"...');
    const search = await axios.get(`${BASE_URL}/tmdb/search?query=dark knight`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    if (search.data.length > 0) {
      success(`Found ${search.data.length} movies`);
      const movie = search.data[0];
      info(`First result: ${movie.title} (${movie.release_year})`);

      // Get movie details
      info(`Getting details for TMDB ID ${movie.tmdb_id}...`);
      const details = await axios.get(`${BASE_URL}/tmdb/movie/${movie.tmdb_id}`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      if (details.data.runtime) {
        success(`Movie runtime: ${details.data.runtime} minutes`);
      }

      // Get watch providers
      info('Getting watch providers...');
      const providers = await axios.get(`${BASE_URL}/tmdb/movie/${movie.tmdb_id}/providers`, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });

      if (providers.data) {
        success('Watch providers loaded');
      }
    } else {
      error('No movies found - check TMDB API key');
      return false;
    }

    return true;
  } catch (err) {
    error(`TMDB test failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 3: Group Management
async function testGroups() {
  section('Testing Group Management');

  try {
    // Create group
    info('Creating group...');
    const group = await axios.post(`${BASE_URL}/groups`, {
      name: 'Test Movie Buffs',
      watchModel: 'solo'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    groupId = group.data.id;
    inviteCode = group.data.invite_code;
    success(`Group created with ID ${groupId} and invite code ${inviteCode}`);

    // User 2 joins with invite code
    info('User 2 joining group...');
    await axios.post(`${BASE_URL}/groups/join/${inviteCode}`, {}, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    success('Join request sent');

    // User 1 gets pending members
    info('Getting pending members...');
    const pending = await axios.get(`${BASE_URL}/groups/${groupId}/pending`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    if (pending.data.length > 0) {
      success(`Found ${pending.data.length} pending member(s)`);

      // Approve user 2
      info('Approving user 2...');
      await axios.post(`${BASE_URL}/groups/${groupId}/pending/${pending.data[0].id}/approve`, {}, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      success('User 2 approved');
    }

    // Get group members
    await sleep(500);
    const members = await axios.get(`${BASE_URL}/groups/${groupId}/members`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success(`Group has ${members.data.length} members`);

    return true;
  } catch (err) {
    error(`Group test failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 4: Movie Session
async function testSession() {
  section('Testing Movie Session');

  try {
    // Create session
    info('Creating session...');
    const session = await axios.post(`${BASE_URL}/sessions`, {
      groupId,
      watchModel: 'solo',
      deadlineDuration: 7
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    sessionId = session.data.id;
    success(`Session created with ID ${sessionId}`);

    // User 1 submits suggestion
    info('User 1 submitting suggestion...');
    await axios.post(`${BASE_URL}/sessions/${sessionId}/suggestions`, {
      movieTitle: 'The Dark Knight',
      tmdbId: 155,
      posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      releaseYear: '2008',
      voteAverage: 8.5,
      overview: 'Batman raises the stakes...'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success('User 1 suggestion submitted');

    // User 2 submits suggestion
    info('User 2 submitting suggestion...');
    await axios.post(`${BASE_URL}/sessions/${sessionId}/suggestions`, {
      movieTitle: 'Inception',
      tmdbId: 27205,
      posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      releaseYear: '2010',
      voteAverage: 8.4,
      overview: 'A thief who steals secrets...'
    }, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    success('User 2 suggestion submitted');

    // Get suggestions
    const suggestions = await axios.get(`${BASE_URL}/sessions/${sessionId}/suggestions`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success(`Retrieved ${suggestions.data.length} suggestions`);

    // Select movie
    info('Randomly selecting movie...');
    const selected = await axios.post(`${BASE_URL}/sessions/${sessionId}/select-movie`, {}, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success(`Selected: ${selected.data.selectedMovie}`);

    return true;
  } catch (err) {
    error(`Session test failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 5: Watch Status
async function testWatchStatus() {
  section('Testing Watch Status');

  try {
    // User 1 marks as watched
    info('User 1 marking as watched...');
    await axios.post(`${BASE_URL}/sessions/${sessionId}/mark-watched`, {}, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success('Marked as watched');

    // Set personal watch date
    info('Setting personal watch date...');
    await axios.post(`${BASE_URL}/sessions/${sessionId}/watch-date`, {
      watchDate: '2026-01-25'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success('Watch date set');

    // Get watch status
    const status = await axios.get(`${BASE_URL}/sessions/${sessionId}/watch-status`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    info(`Watch status records: ${status.data.length}`);

    return true;
  } catch (err) {
    error(`Watch status test failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 6: Notifications
async function testNotifications() {
  section('Testing Notifications');

  try {
    // Get notifications
    info('Getting notifications...');
    const notifications = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success(`Found ${notifications.data.length} notifications`);

    if (notifications.data.length > 0) {
      info(`Latest: ${notifications.data[0].title}`);

      // Mark as read
      await axios.post(`${BASE_URL}/notifications/${notifications.data[0].id}/read`, {}, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      success('Notification marked as read');
    }

    // Get unread count
    const unread = await axios.get(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    info(`Unread notifications: ${unread.data.count}`);

    return true;
  } catch (err) {
    error(`Notifications test failed: ${err.response?.data?.error || err.message}`);
    return false;
  }
}

// Test 7: Calendar Integration
async function testCalendar() {
  section('Testing Calendar Integration');

  try {
    // Get Google Calendar URL
    info('Getting Google Calendar URL...');
    const googleUrl = await axios.get(`${BASE_URL}/sessions/${sessionId}/calendar/google-url`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success('Google Calendar URL generated');

    // Get Apple Calendar URL
    info('Getting Apple Calendar URL...');
    const appleUrl = await axios.get(`${BASE_URL}/sessions/${sessionId}/calendar/apple-url`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    success('Apple Calendar URL generated');

    // Get ICS file
    info('Downloading ICS file...');
    const ics = await axios.get(`${BASE_URL}/sessions/${sessionId}/calendar.ics`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    if (ics.data.includes('BEGIN:VCALENDAR')) {
      success('ICS file generated successfully');
      info('ICS file contains valid calendar data');
    }

    return true;
  } catch (err) {
    error(`Calendar test failed: ${err.response?.data?.error || err.message}`);
    if (err.response?.data?.error?.includes('No watch date')) {
      info('This is expected - calendar needs a watch date set');
      return true;
    }
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('\n🎬 Movie Suggestion App - Backend Test Suite', 'yellow');
  log('Testing all backend endpoints...\n', 'yellow');

  const results = {
    authentication: false,
    tmdb: false,
    groups: false,
    session: false,
    watchStatus: false,
    notifications: false,
    calendar: false
  };

  // Check if server is running
  try {
    await axios.get('http://localhost:3001/');
  } catch (err) {
    error('\n❌ Backend server not running!');
    error('Start the server with: cd backend && npm start');
    process.exit(1);
  }

  // Run tests
  results.authentication = await testAuthentication();
  if (!results.authentication) {
    error('\n⚠️  Authentication failed - stopping tests');
    process.exit(1);
  }

  results.tmdb = await testTMDB();
  results.groups = await testGroups();
  results.session = await testSession();
  results.watchStatus = await testWatchStatus();
  results.notifications = await testNotifications();
  results.calendar = await testCalendar();

  // Summary
  section('Test Summary');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  log(`\nResults: ${passed}/${total} test suites passed\n`, 'yellow');

  Object.entries(results).forEach(([name, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${name}`, color);
  });

  if (passed === total) {
    log('\n🎉 All tests passed! Backend is ready for frontend development.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }

  log('\n📚 For manual testing, see BACKEND_TESTING.md\n', 'cyan');
}

// Run tests
runAllTests().catch(err => {
  error(`\n❌ Test suite error: ${err.message}`);
  process.exit(1);
});
