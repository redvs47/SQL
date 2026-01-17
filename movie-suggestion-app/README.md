# Movie Suggestion App

A full-stack web application for groups to collaboratively suggest movies, randomly select one, plan watch dates, and share video reviews.

## Features

- **User Authentication**: Full registration and login system
- **Group Management**: Create and join groups to watch movies together
- **Movie Suggestions**: Each user can submit their movie suggestion
- **Random Selection**: Automatically picks a random movie once 2+ people submit suggestions
- **Watch Date Planning**: Set the date when the group plans to watch the selected movie
- **Video Reviews**: Upload video reviews (max 3 minutes) and share them with the group
- **Real-time Updates**: See suggestions and reviews from all group members

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **SQLite** database
- **JWT** authentication
- **bcrypt** for password hashing
- **Multer** for video file uploads

### Frontend
- **React** 18
- **React Router** for navigation
- **Axios** for API requests
- Modern, responsive UI with custom CSS

## Database Schema

- `users`: User accounts with authentication
- `groups`: Movie watching groups
- `group_members`: Many-to-many relationship between users and groups
- `movie_sessions`: Individual movie selection sessions
- `movie_suggestions`: Movie titles suggested by users
- `video_reviews`: Video review submissions

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. The `.env` file is already configured with default settings. For production, update the JWT_SECRET:
```
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

4. Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage Guide

### 1. Registration and Login
- Open `http://localhost:3000` in your browser
- Register a new account with username, email, and password
- Or login if you already have an account

### 2. Create or Join a Group
- After logging in, you'll see the dashboard
- Create a new group by clicking "Create New Group"
- Or join an existing group using its Group ID

### 3. Start a Movie Session
- Click on any group card to start or continue a session
- Each group can have one active session at a time

### 4. Submit Movie Suggestions
- In the session, submit your movie suggestion
- Wait for at least 2 people to submit suggestions
- Once 2+ suggestions are submitted, click "Randomly Select Movie"

### 5. Set Watch Date
- After a movie is selected, set the date when you plan to watch it
- This helps coordinate with group members

### 6. Submit Video Review
- After watching the movie, record a video review (max 3 minutes)
- Upload the video through the interface
- View reviews from other group members

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Groups
- `POST /api/groups` - Create new group
- `GET /api/groups` - Get user's groups
- `POST /api/groups/:groupId/join` - Join group
- `GET /api/groups/:groupId/active-session` - Get active session

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:sessionId` - Get session details
- `POST /api/sessions/:sessionId/suggestions` - Submit movie suggestion
- `GET /api/sessions/:sessionId/suggestions` - Get all suggestions
- `POST /api/sessions/:sessionId/select-movie` - Randomly select movie
- `POST /api/sessions/:sessionId/watch-date` - Set watch date
- `POST /api/sessions/:sessionId/reviews` - Upload video review
- `GET /api/sessions/:sessionId/reviews` - Get all reviews

## File Structure

```
movie-suggestion-app/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── .env                      # Environment variables
│   ├── database.js               # SQLite database setup
│   ├── package.json              # Backend dependencies
│   ├── server.js                 # Main Express server
│   └── movie_app.db             # SQLite database (created on first run)
├── frontend/
│   ├── public/
│   │   └── index.html           # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js         # Login component
│   │   │   ├── Register.js      # Registration component
│   │   │   ├── Dashboard.js     # Group dashboard
│   │   │   └── MovieSession.js  # Main session interface
│   │   ├── App.js               # Main app component
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Global styles
│   └── package.json             # Frontend dependencies
├── uploads/
│   └── videos/                  # Uploaded video reviews
└── README.md                    # This file
```

## Features in Detail

### User Authentication
- Secure password hashing with bcrypt
- JWT token-based authentication
- Token stored in localStorage for persistent sessions

### Group System
- Users can create multiple groups
- Users can join groups using Group ID
- Each group maintains its own movie sessions

### Movie Selection Flow
1. **Collecting Suggestions**: Users submit their movie suggestions
2. **Random Selection**: After 2+ suggestions, randomly pick one
3. **Watch Date**: Set when the group will watch the movie
4. **Video Reviews**: Members upload their video reviews after watching

### Video Upload
- Client-side validation for 3-minute maximum duration
- Server-side file type validation
- Videos stored in local file system
- Supports common video formats (MP4, MOV, AVI, MKV, WebM)

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- Protected API routes with authentication middleware
- File type validation for video uploads
- SQL injection prevention with parameterized queries

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm start  # React development server with hot reload
```

## Troubleshooting

### Port Already in Use
If port 3001 (backend) or 3000 (frontend) is already in use:
- Change the PORT in `backend/.env`
- Or kill the process using the port

### Database Issues
If you encounter database errors:
- Delete `backend/movie_app.db`
- Restart the backend server to recreate the database

### Video Upload Fails
- Ensure video is under 3 minutes
- Check file size is under 50MB
- Verify video format is supported

### CORS Issues
- The backend is configured with CORS enabled
- Frontend proxy is set to `http://localhost:3001`

## Future Enhancements

Possible features to add:
- Email notifications for movie selection and watch dates
- Movie ratings and comments
- Integration with movie APIs (TMDB, OMDB) for movie details
- Social features (reactions, comments on reviews)
- Mobile app version
- Video streaming instead of download
- Group chat functionality

## License

MIT License - feel free to use this project for learning or personal use.

## Support

For issues or questions, please create an issue in the repository.
