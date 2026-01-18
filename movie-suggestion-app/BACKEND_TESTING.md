# Backend Testing Guide

Complete guide to test all backend features before frontend development.

## Prerequisites

1. **Install Dependencies**
```bash
cd movie-suggestion-app/backend
npm install
```

2. **Configure Environment**
Edit `.env` file and add your TMDB API key:
```
TMDB_API_KEY=your-actual-tmdb-api-key
```

3. **Start Backend Server**
```bash
npm start
```

Server should start on `http://localhost:3001`

---

## Testing Tools

### Option 1: Postman/Insomnia
Import the API collection (coming next) and test with GUI

### Option 2: cURL Commands (Terminal)
All tests below use cURL - copy/paste directly into terminal

### Option 3: Test Script
Run automated test script: `node test-backend.js`

---

## 1. Authentication Tests

### Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "email": "test1@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser1",
    "email": "test1@example.com"
  }
}
```

**Save the token** - you'll need it for authenticated requests!

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser1",
    "password": "password123"
  }'
```

---

## 2. TMDB Integration Tests

### Search Movies
```bash
curl -X GET "http://localhost:3001/api/tmdb/search?query=dark+knight" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
[
  {
    "tmdb_id": 155,
    "title": "The Dark Knight",
    "release_year": "2008",
    "poster_path": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "poster_url": "https://image.tmdb.org/t/p/w185/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "vote_average": 8.5,
    "overview": "Batman raises the stakes..."
  }
]
```

**✅ Verify:**
- Returns array of movies
- Each has tmdb_id, title, poster_url, rating
- Poster URLs are valid

### Get Movie Details
```bash
curl -X GET http://localhost:3001/api/tmdb/movie/155 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "tmdb_id": 155,
  "title": "The Dark Knight",
  "release_year": "2008",
  "runtime": 152,
  "genres": [...],
  "cast": [...],
  "crew": [...],
  "trailer": {...}
}
```

**✅ Verify:**
- Returns full movie details
- Has runtime, cast, crew
- Poster and backdrop URLs work

### Get Watch Providers
```bash
curl -X GET http://localhost:3001/api/tmdb/movie/155/providers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "link": "https://www.themoviedb.org/movie/155/watch",
  "flatrate": [
    {
      "name": "Netflix",
      "logo_url": "https://image.tmdb.org/t/p/w92/..."
    }
  ]
}
```

---

## 3. Group Management Tests

### Create a Group
```bash
curl -X POST http://localhost:3001/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Movie Buffs",
    "watchModel": "solo"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "Movie Buffs",
  "invite_code": "A1B2C3D4",
  "default_watch_model": "solo",
  "message": "Group created successfully"
}
```

**Save the group ID and invite_code!**

### Get User's Groups
```bash
curl -X GET http://localhost:3001/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Register Second User (for testing)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "email": "test2@example.com",
    "password": "password123"
  }'
```

### Join Group with Invite Code (as user 2)
```bash
curl -X POST http://localhost:3001/api/groups/join/A1B2C3D4 \
  -H "Authorization: Bearer USER2_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "message": "Join request sent. Waiting for approval.",
  "groupName": "Movie Buffs"
}
```

### Get Pending Members (as group leader - user 1)
```bash
curl -X GET http://localhost:3001/api/groups/1/pending \
  -H "Authorization: Bearer USER1_TOKEN_HERE"
```

### Approve Pending Member
```bash
curl -X POST http://localhost:3001/api/groups/1/pending/1/approve \
  -H "Authorization: Bearer USER1_TOKEN_HERE"
```

**✅ Verify:**
- User 2 gets approval notification
- User 2 can now see the group
- Group member count increases

---

## 4. Movie Session Tests

### Create Session
```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "groupId": 1,
    "watchModel": "solo",
    "deadlineDuration": 7
  }'
```

**Save the session ID!**

### Submit Movie Suggestions (User 1)
```bash
curl -X POST http://localhost:3001/api/sessions/1/suggestions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER1_TOKEN_HERE" \
  -d '{
    "movieTitle": "The Dark Knight",
    "tmdbId": 155,
    "posterPath": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "releaseYear": "2008",
    "voteAverage": 8.5,
    "overview": "Batman raises the stakes..."
  }'
```

### Submit Movie Suggestions (User 2)
```bash
curl -X POST http://localhost:3001/api/sessions/1/suggestions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER2_TOKEN_HERE" \
  -d '{
    "movieTitle": "Inception",
    "tmdbId": 27205,
    "posterPath": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "releaseYear": "2010",
    "voteAverage": 8.4,
    "overview": "A thief who steals secrets..."
  }'
```

### Get Suggestions
```bash
curl -X GET http://localhost:3001/api/sessions/1/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Randomly Select Movie
```bash
curl -X POST http://localhost:3001/api/sessions/1/select-movie \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "message": "Movie selected successfully",
  "selectedMovie": "The Dark Knight",
  "tmdbId": 155
}
```

**✅ Verify:**
- Movie selection is random
- Session status updates to "movie_selected"
- All users get notification

---

## 5. Watch Status Tests

### Mark as Watched
```bash
curl -X POST http://localhost:3001/api/sessions/1/mark-watched \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**✅ Verify:**
- Other users get "user watched" notification

### Set Personal Watch Date (Solo Mode)
```bash
curl -X POST http://localhost:3001/api/sessions/1/watch-date \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "watchDate": "2026-01-25"
  }'
```

### Get Watch Status for All Users
```bash
curl -X GET http://localhost:3001/api/sessions/1/watch-status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 6. Party Mode Voting Tests

**Note:** First create a Party Mode session

### Create Party Mode Session
```bash
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "groupId": 1,
    "watchModel": "party",
    "deadlineDuration": 7
  }'
```

### Create Time Vote Slots
```bash
curl -X POST http://localhost:3001/api/sessions/2/vote-slots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "proposedTimes": [
      "2026-01-25T20:00:00Z",
      "2026-01-26T19:00:00Z",
      "2026-01-26T20:00:00Z"
    ]
  }'
```

### Vote on Time Slots
```bash
curl -X POST http://localhost:3001/api/sessions/2/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "slotIds": [1, 3]
  }'
```

### Get Vote Results
```bash
curl -X GET http://localhost:3001/api/sessions/2/vote-slots \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Finalize Voting
```bash
curl -X POST http://localhost:3001/api/sessions/2/finalize-vote \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**✅ Verify:**
- Winning time has most votes
- Session updates with scheduled_watch_time
- All users get notification

---

## 7. Video Review & Chat Tests

**Note:** Create a test video file first:
```bash
# Create a short test video (5 seconds, black screen)
ffmpeg -f lavfi -i color=black:s=640x480:d=5 -f lavfi -i anullsrc -shortest test-video.mp4
```

### Upload Video Review
```bash
curl -X POST http://localhost:3001/api/sessions/1/reviews \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "video=@test-video.mp4"
```

**Expected Response:**
```json
{
  "id": 1,
  "videoPath": "/uploads/videos/video-1234567890.mp4",
  "message": "Review submitted successfully"
}
```

**✅ Verify:**
- Video file uploaded to `/uploads/videos/`
- Review auto-posts to chat
- User marked as watched
- Other users get notification

### Get Chat Messages
```bash
curl -X GET http://localhost:3001/api/sessions/1/chat \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "locked": false,
  "messages": [
    {
      "id": 1,
      "message_type": "video",
      "video_path": "/uploads/videos/video-1234567890.mp4",
      "is_review": 1,
      "username": "testuser1",
      "created_at": "2026-01-18T..."
    }
  ]
}
```

### Post Text Chat Message
```bash
curl -X POST http://localhost:3001/api/sessions/1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "Great movie! Loved the Joker performance."
  }'
```

### Post Video Chat Message
```bash
curl -X POST http://localhost:3001/api/sessions/1/chat \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "video=@test-video.mp4"
```

**✅ Verify:**
- Chat locked until user submits review
- After review: can post text and video
- All messages appear in chronological order
- Other users get chat notifications

---

## 8. Calendar Integration Tests

### Download ICS File
```bash
curl -X GET http://localhost:3001/api/sessions/1/calendar.ics \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output watch-event.ics
```

**✅ Verify:**
- File downloads successfully
- Open in calendar app (double-click)
- Event has movie title, runtime, description
- Event has reminders (1h, 15m before)

### Get Google Calendar URL
```bash
curl -X GET http://localhost:3001/api/sessions/1/calendar/google-url \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "url": "https://calendar.google.com/calendar/render?action=TEMPLATE&text=..."
}
```

**✅ Verify:**
- URL is valid Google Calendar link
- Opens Google Calendar with pre-filled event
- Event details are correct

### Get Apple Calendar URL
```bash
curl -X GET http://localhost:3001/api/sessions/1/calendar/apple-url \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "url": "webcal://localhost:3000/api/sessions/1/calendar.ics"
}
```

---

## 9. Notification Tests

### Get All Notifications
```bash
curl -X GET http://localhost:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "type": "movie_selected",
    "title": "Movie Selected!",
    "message": "The Dark Knight was selected! Time to watch!",
    "is_read": 0,
    "created_at": "2026-01-18T..."
  }
]
```

### Get Unread Count
```bash
curl -X GET http://localhost:3001/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Mark Notification as Read
```bash
curl -X POST http://localhost:3001/api/notifications/1/read \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Mark All as Read
```bash
curl -X POST http://localhost:3001/api/notifications/read-all \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Notification Preferences
```bash
curl -X POST http://localhost:3001/api/notification-preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "notificationType": "chat_message",
    "enabled": false
  }'
```

### Mute a Group
```bash
curl -X POST http://localhost:3001/api/groups/1/mute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "muted": true
  }'
```

---

## 10. Leader Actions Tests

### Extend Deadline
```bash
curl -X POST http://localhost:3001/api/sessions/1/extend-deadline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer LEADER_TOKEN_HERE" \
  -d '{
    "days": 3
  }'
```

**✅ Verify:**
- Only leader can extend
- Non-leader gets 403 error
- All users get notification

### Close Session
```bash
curl -X POST http://localhost:3001/api/sessions/1/close \
  -H "Authorization: Bearer LEADER_TOKEN_HERE"
```

**✅ Verify:**
- Only leader can close
- Session status updates to "closed"
- All users get notification

---

## Complete Testing Checklist

### Authentication ✅
- [ ] Register works
- [ ] Login works
- [ ] JWT token returned
- [ ] Token works for authenticated endpoints
- [ ] Invalid credentials rejected

### TMDB Integration ✅
- [ ] Movie search returns results
- [ ] Search handles special characters
- [ ] Movie details loads
- [ ] Watch providers available
- [ ] Poster URLs work
- [ ] Handles movies not found

### Groups ✅
- [ ] Create group generates invite code
- [ ] Join with invite code works
- [ ] Pending members system works
- [ ] Leader can approve/deny
- [ ] Member count accurate
- [ ] Default watch model saves

### Sessions ✅
- [ ] Create solo mode session
- [ ] Create party mode session
- [ ] Get active session works
- [ ] Session status updates correctly

### Suggestions ✅
- [ ] Submit suggestion with TMDB data
- [ ] Can't submit duplicate
- [ ] Get all suggestions
- [ ] Random selection works (2+ required)
- [ ] Selected movie notification sent

### Watch Status ✅
- [ ] Mark as watched works
- [ ] Personal watch date saves (solo)
- [ ] Watch status visible to all
- [ ] Notifications sent

### Party Mode Voting ✅
- [ ] Create time slots
- [ ] Vote on multiple slots
- [ ] Vote count increments
- [ ] Finalize picks winner
- [ ] Scheduled time saves
- [ ] Voting notifications sent

### Reviews & Chat ✅
- [ ] Video upload works
- [ ] Review auto-posts to chat
- [ ] Chat locked until review submitted
- [ ] Text messages work
- [ ] Video messages work
- [ ] Chronological order
- [ ] Chat notifications sent

### Calendar ✅
- [ ] ICS file downloads
- [ ] ICS imports to calendar app
- [ ] Event has correct details
- [ ] Google Calendar URL works
- [ ] Apple Calendar URL works
- [ ] Runtime from TMDB correct
- [ ] Reminders work

### Notifications ✅
- [ ] All notification types fire
- [ ] Unread count accurate
- [ ] Mark as read works
- [ ] Preferences save
- [ ] Group muting works
- [ ] Respects user preferences

### Leader Actions ✅
- [ ] Extend deadline (leader only)
- [ ] Close session (leader only)
- [ ] Non-leader gets 403
- [ ] Notifications sent

---

## Common Issues & Solutions

### 500 Error on Movie Search
**Problem**: TMDB API key not configured

**Solution**: Add real TMDB API key to `.env`

### Database Errors
**Problem**: Tables don't exist

**Solution**: Restart server - migrations run automatically after 1 second

### Video Upload Fails
**Problem**: Upload directory doesn't exist

**Solution**: Directory created automatically, check file permissions

### Notifications Not Sending
**Problem**: User preferences or group mutes

**Solution**: Check notification_preferences and group_mutes tables

### Calendar Events Missing Data
**Problem**: Movie doesn't have TMDB data

**Solution**: Ensure movie suggestion has valid tmdb_id

---

## Next: Automated Testing

Run `node test-backend.js` to test all endpoints automatically!
