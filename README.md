# Roulette Movie Club

A full-stack collaborative movie suggestion and review application where groups can suggest movies, randomly select one to watch together, and share video reviews.

## Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Group Management**: Create groups with unique invite codes, approve members
- **TMDB Integration**: Search movies with autocomplete, view posters and ratings
- **Movie Selection**: Random selection from group suggestions
- **Watch Tracking**: Mark movies as watched with personal dates
- **Video Reviews**: Upload video reviews (max 3 minutes)
- **Group Chat**: Text and video messages (unlocked after submitting review)
- **Calendar Integration**: Export to Google Calendar, Apple Calendar, or ICS file
- **Notifications**: Real-time notifications for all group activities

### Technology Stack

**Backend**
- Node.js + Express.js
- SQLite database (16 tables)
- JWT authentication
- TMDB API integration
- Multer for video uploads
- Full notification system

**Web Frontend**
- React 18 with Hooks
- React Router for navigation
- Axios for API requests
- Modern responsive UI
- Real-time polling for updates

**Mobile App**
- Flutter for iOS & Android
- Camera integration
- Video recording and playback
- Material Design 3 UI

## Quick Start

### Prerequisites
- Node.js 14+ and npm
- (Optional) Flutter 3.0+ for mobile app

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd movie-suggestion-app/backend
   npm install
   ```

2. **Configure TMDB API:**
   - Get your TMDB "Read Access Token" (Bearer token) from https://www.themoviedb.org/settings/api
   - **Important**: Use the long "Read Access Token" (starts with "eyJ"), NOT the short v3 API key
   - Edit `backend/.env` and add your token:
     ```
     TMDB_API_KEY=eyJhbGciOiJIUzI1NiJ9...
     ```

3. **Start the backend:**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3001`

### Web Frontend Setup

1. **Install dependencies:**
   ```bash
   cd movie-suggestion-app/frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```
   App runs on `http://localhost:3000`

### Mobile App Setup (Optional)

1. **Install Flutter** (v3.0+): https://docs.flutter.dev/get-started/install

2. **Install dependencies:**
   ```bash
   cd movie-suggestion-app/mobile
   flutter pub get
   ```

3. **Configure backend URL:**
   Edit `lib/services/api_service.dart`:
   - Android emulator: `http://10.0.2.2:3001/api`
   - iOS simulator: `http://localhost:3001/api`
   - Physical device: `http://YOUR_IP:3001/api`

4. **Run the app:**
   ```bash
   flutter run
   ```

## How It Works

1. **Register/Login**: Create an account or sign in
2. **Create/Join Group**: Start a new group or join with an invite code
3. **Start Session**: Click on a group to start a movie session
4. **Submit Suggestions**: Search TMDB for movies and submit your pick
5. **Random Selection**: Once 2+ members suggest, the leader randomly selects
6. **Watch Movie**: Mark as watched when you finish
7. **Submit Review**: Upload a video review (unlocks chat)
8. **Chat**: Discuss the movie with text and video messages
9. **Calendar**: Add watch dates to your calendar

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Groups
- `POST /api/groups` - Create group (returns invite code)
- `GET /api/groups` - Get user's groups
- `POST /api/groups/join/:inviteCode` - Join group (sends request)
- `GET /api/groups/:id/pending` - Get pending members (leader only)
- `POST /api/groups/:id/pending/:userId/approve` - Approve member

### TMDB
- `GET /api/tmdb/search?query=` - Search movies
- `GET /api/tmdb/movie/:id` - Get movie details
- `GET /api/tmdb/movie/:id/providers` - Get streaming providers

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `GET /api/groups/:id/active-session` - Get active session
- `POST /api/sessions/:id/suggestions` - Submit suggestion
- `GET /api/sessions/:id/suggestions` - Get all suggestions
- `POST /api/sessions/:id/select-movie` - Random select (leader only)
- `POST /api/sessions/:id/mark-watched` - Mark as watched
- `GET /api/sessions/:id/watch-status` - Get watch status

### Reviews & Chat
- `POST /api/sessions/:id/reviews` - Upload video review
- `GET /api/sessions/:id/reviews` - Get all reviews
- `POST /api/sessions/:id/chat` - Send chat message
- `GET /api/sessions/:id/chat` - Get chat messages

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `GET /api/notification-preferences` - Get preferences
- `POST /api/notification-preferences` - Update preferences

### Calendar
- `GET /api/sessions/:id/calendar.ics` - Download ICS file
- `GET /api/sessions/:id/calendar/google-url` - Get Google Calendar URL
- `GET /api/sessions/:id/calendar/apple-url` - Get Apple Calendar URL

## Database Schema

16 tables automatically created:
- `users` - User accounts
- `groups` - Movie groups
- `group_members` - Group membership
- `pending_members` - Pending approvals
- `movie_sessions` - Session instances
- `movie_suggestions` - Movie picks
- `video_reviews` - Video reviews
- `user_watch_status` - Watch tracking
- `time_vote_slots` - Party mode voting
- `time_votes` - Time votes
- `chat_messages` - Group chat
- `notifications` - User notifications
- `notification_preferences` - User preferences
- `group_mutes` - Muted groups
- `migrations` - Schema versioning
- `calendar_preferences` - Calendar settings

## Project Structure

```
movie-suggestion-app/
├── backend/
│   ├── middleware/
│   │   └── auth.js                    # JWT authentication
│   ├── services/
│   │   ├── tmdbService.js             # TMDB API wrapper
│   │   ├── notificationService.js     # Notifications
│   │   └── calendarService.js         # Calendar generation
│   ├── .env                           # Environment variables
│   ├── database.js                    # SQLite setup
│   ├── server.js                      # Main Express server
│   ├── test-backend.js                # Test suite
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js               # Login page
│   │   │   ├── Register.js            # Registration
│   │   │   ├── Dashboard.js           # Group dashboard
│   │   │   ├── MovieSession.js        # Main session interface
│   │   │   └── Notifications.js       # Notifications panel
│   │   ├── App.js                     # Main app component
│   │   ├── index.js                   # React entry point
│   │   └── index.css                  # Global styles
│   └── package.json
├── mobile/
│   ├── lib/
│   │   ├── models/                    # Data models
│   │   ├── screens/                   # UI screens
│   │   ├── services/                  # API services
│   │   ├── widgets/                   # Custom widgets
│   │   └── main.dart                  # App entry point
│   └── pubspec.yaml
├── uploads/
│   └── videos/                        # Video uploads
├── BACKEND_TESTING.md                 # Manual test guide
├── QUICKSTART.md                      # 5-minute setup
├── TMDB_SETUP.md                      # TMDB configuration
├── CALENDAR_INTEGRATION.md            # Calendar features
└── README.md                          # This file
```

## Testing

### Automated Backend Tests
```bash
cd backend
npm start  # Start server first
node test-backend.js
```

Tests 7 feature areas:
- Authentication
- TMDB Integration
- Group Management
- Movie Sessions
- Watch Status
- Notifications
- Calendar Integration

### Manual Testing
See `BACKEND_TESTING.md` for detailed manual testing with cURL commands.

## Current Status

✅ **Backend**: 100% Complete (50+ endpoints, 16 tables, all features working)
✅ **Web Frontend**: 100% Complete (TMDB search, chat, calendar, notifications)
✅ **Mobile App**: Structure complete, ready for Flutter installation
⚠️ **TMDB Integration**: Requires Read Access Token (see TMDB_SETUP.md)

## Features Implemented

### Backend (100%)
- ✅ Authentication with JWT
- ✅ Group management with invite codes
- ✅ TMDB movie search and details
- ✅ Movie sessions and suggestions
- ✅ Random movie selection
- ✅ Watch status tracking
- ✅ Video review uploads
- ✅ Group chat (text + video)
- ✅ 12 notification types
- ✅ Calendar integration (Google/Apple/ICS)
- ✅ Leader actions (extend deadline, close session)
- ✅ Solo and Party watch modes

### Web Frontend (100%)
- ✅ User registration and login
- ✅ Group dashboard with invite codes
- ✅ TMDB autocomplete search
- ✅ Movie suggestion submission
- ✅ Random selection interface
- ✅ Watch status marking
- ✅ Video review upload
- ✅ Real-time group chat
- ✅ Notifications panel
- ✅ Calendar export (3 formats)
- ✅ Responsive design
- ✅ Tab navigation

### Mobile App (Structure Complete)
- ✅ Flutter project structure
- ✅ All screens implemented
- ✅ API service layer
- ✅ State management with Provider
- ✅ Camera integration
- ✅ Video player/recorder widgets
- ⏸️ Requires Flutter installation to build

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- Protected API routes
- File type validation for uploads
- SQL injection prevention
- CORS configuration

## Documentation

- `README.md` - This file (overview and setup)
- `QUICKSTART.md` - 5-minute quick start guide
- `BACKEND_TESTING.md` - Complete testing guide
- `TMDB_SETUP.md` - TMDB API configuration
- `CALENDAR_INTEGRATION.md` - Calendar feature docs
- `PR_DESCRIPTION.md` - Pull request summary

## Troubleshooting

### TMDB Search Not Working
**Solution**: Update `backend/.env` with your TMDB "Read Access Token" (Bearer token), not the v3 API key. See `TMDB_SETUP.md`.

### Port Already in Use
**Solution**: Change `PORT` in `backend/.env` or kill the process using port 3001/3000.

### Database Errors
**Solution**: Delete `backend/movie_app.db` and restart server to recreate tables.

### Video Upload Fails
**Solution**: Ensure video is under 3 minutes and 50MB. Check supported formats: MP4, MOV, AVI, MKV, WebM.

## Future Enhancements

Possible additions:
- Email notifications
- Push notifications for mobile
- Movie ratings and comments
- Social reactions to reviews
- Advanced watch modes (Party mode voting UI)
- Video streaming instead of download
- Movie recommendations based on history

## License

MIT License - Free for personal and educational use

## Contributing

This project was built as a comprehensive full-stack application demonstrating:
- RESTful API design
- React frontend development
- Real-time features with polling
- Video upload and streaming
- Multi-platform support (web + mobile)
- Modern authentication patterns
- Database design and normalization

## Support

For issues or questions:
- Check the documentation files in the repo
- Review `BACKEND_TESTING.md` for testing guidance
- See `TMDB_SETUP.md` for API configuration help

---

**Built with ❤️ for movie lovers who want to share the experience**
