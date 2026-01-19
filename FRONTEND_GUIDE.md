# Frontend Setup Guide

This guide covers setting up both the **Web Frontend** (React) and **Mobile App** (Flutter) for the Roulette Movie Club application.

---

## Web Frontend (React)

### Prerequisites
- Node.js 14+ and npm
- Backend server running on http://localhost:3001

### Quick Start

1. **Navigate to frontend directory:**
   ```bash
   cd movie-suggestion-app/frontend
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Access the app:**
   - Open http://localhost:3000 in your browser
   - The app will automatically proxy API requests to http://localhost:3001

### Features Available

#### Authentication
- User registration with username, email, password
- Login with username/password
- JWT token stored in localStorage
- Auto-login on page refresh

#### Dashboard
- View all your groups
- Create new groups (receives invite code)
- Join groups with 8-character invite code
- Real-time notification bell with unread count
- Notifications update every 10 seconds

#### Movie Session
- **Session Tab:**
  - TMDB autocomplete movie search with posters
  - Submit movie suggestions
  - Random selection (leader only)
  - Watch status tracking
  - Video review upload (3 min max)
  - View all member reviews

- **Chat Tab:**
  - iMessage-style group chat
  - Text and video messages
  - Review-gated access (must submit review first)
  - Real-time updates

- **Calendar Tab:**
  - Export to Google Calendar
  - Export to Apple Calendar
  - Download ICS file

#### Notifications
- 12 notification types
- Unread count badge
- Mark individual as read
- Mark all as read
- Slide-in panel from right

### Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js          # Login page
│   │   ├── Register.js       # Registration page
│   │   ├── Dashboard.js      # Group dashboard with notifications
│   │   ├── MovieSession.js   # Main session interface
│   │   └── Notifications.js  # Notification panel
│   ├── App.js                # Main app with routing
│   ├── index.js              # React entry point
│   └── index.css             # Global styles
└── package.json              # Dependencies
```

### Configuration

**Backend URL:** Configured in `package.json`:
```json
{
  "proxy": "http://localhost:3001"
}
```

To change the backend URL for production:
1. Remove the `proxy` line from `package.json`
2. Update all API calls to use full URLs: `http://your-backend-url/api/...`

### Building for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

### Troubleshooting

**Cannot connect to backend:**
- Ensure backend is running on port 3001
- Check `package.json` proxy configuration
- Clear browser cache and localStorage

**Login not persisting:**
- Check browser console for errors
- Ensure localStorage is enabled
- Try clearing localStorage: `localStorage.clear()`

**TMDB search not working:**
- Verify TMDB Read Access Token in backend `.env`
- Check network tab for 403 errors
- App works fine without TMDB (manual entry)

---

## Mobile App (Flutter)

### Prerequisites
- Flutter SDK 3.0+ ([Install Flutter](https://docs.flutter.dev/get-started/install))
- Android Studio (for Android) or Xcode (for iOS)
- Backend server accessible from device/emulator

### Quick Start

1. **Navigate to mobile directory:**
   ```bash
   cd movie-suggestion-app/mobile
   ```

2. **Install Flutter dependencies:**
   ```bash
   flutter pub get
   ```

3. **Configure backend URL:**
   Edit `lib/services/api_service.dart`:

   ```dart
   // For Android emulator:
   static const String baseUrl = 'http://10.0.2.2:3001/api';

   // For iOS simulator:
   static const String baseUrl = 'http://localhost:3001/api';

   // For physical device (replace with your computer's IP):
   static const String baseUrl = 'http://192.168.1.XXX:3001/api';
   ```

4. **Run the app:**
   ```bash
   # List available devices
   flutter devices

   # Run on specific device
   flutter run -d <device-id>

   # Or just run on first available device
   flutter run
   ```

### Features Available

#### Authentication
- User registration
- Login
- JWT token stored in secure storage
- Auto-logout on token expiration

#### Dashboard
- View all groups
- Create new groups (shows invite code)
- Join groups with 8-character invite code
- Pull-to-refresh
- Material Design 3 UI

#### Movie Session
- Submit movie suggestions
- Random selection
- Set watch date
- Upload video reviews from camera or gallery
- View all reviews
- Play reviews inline

### Project Structure

```
mobile/
├── lib/
│   ├── models/
│   │   ├── user.dart              # User model
│   │   ├── group.dart             # Group model (updated with invite_code)
│   │   ├── movie_session.dart     # Session model
│   │   ├── movie_suggestion.dart  # Suggestion model
│   │   └── video_review.dart      # Review model
│   ├── screens/
│   │   ├── login_screen.dart           # Login UI
│   │   ├── register_screen.dart        # Registration UI
│   │   ├── dashboard_screen.dart       # Dashboard (updated for invite codes)
│   │   └── movie_session_screen.dart   # Session UI
│   ├── services/
│   │   ├── api_service.dart       # API client (updated for invite codes)
│   │   └── auth_service.dart      # Auth state management
│   ├── widgets/
│   │   ├── video_player_widget.dart    # Video playback
│   │   └── video_recorder_widget.dart  # Video recording
│   └── main.dart                  # App entry point
├── android/                       # Android config
├── ios/                          # iOS config
└── pubspec.yaml                  # Dependencies
```

### Configuration

**Backend URL Configuration:**

Find your computer's IP address:
- **Windows:** `ipconfig` → Look for IPv4 Address
- **macOS/Linux:** `ifconfig` → Look for inet address
- **Or use:** `hostname -I` (Linux) / `ipconfig getifaddr en0` (macOS)

Then update `lib/services/api_service.dart`:
```dart
static const String baseUrl = 'http://YOUR_IP:3001/api';
```

**Android Network Permissions:**

Already configured in `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

**iOS Permissions:**

Already configured in `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Need camera access to record video reviews</string>
<key>NSMicrophoneUsageDescription</key>
<string>Need microphone access to record audio</string>
```

### Building for Release

#### Android APK
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

#### iOS App
```bash
flutter build ios --release
```
Then open `ios/Runner.xcworkspace` in Xcode to archive and distribute.

### Troubleshooting

**Cannot connect to backend:**
- Verify backend URL in `api_service.dart`
- Ensure device/emulator can reach backend
- Test with: `curl http://YOUR_IP:3001/api` from device
- Check firewall settings

**Video recording not working:**
- Ensure camera permissions are granted
- Check device has working camera
- Review logs: `flutter logs`

**Build errors:**
- Clean build: `flutter clean && flutter pub get`
- Update Flutter: `flutter upgrade`
- Check Flutter doctor: `flutter doctor -v`

---

## Recent Updates (Both Frontends)

### Invite Code System
Both web and mobile have been updated to use **8-character hex invite codes** instead of numeric group IDs:

**Changes Made:**
- ✅ API calls use `/groups/join/INVITECODE` endpoint
- ✅ UI shows "Invite Code" instead of "Group ID"
- ✅ Input validation for 8-character codes
- ✅ Auto-uppercase for codes
- ✅ Display invite code when creating groups
- ✅ Show invite code and member count in group list

**Example Invite Code:** `A3F5B9D2`

### Notification Features (Web Only)
- Real-time notification bell in dashboard
- Slide-in notification panel
- 12 notification types with icons
- Unread count badge
- Mark as read functionality
- Polls every 10 seconds

### TMDB Integration (Web Only)
- Autocomplete movie search
- Movie posters and ratings
- Release year display
- Falls back to manual entry if TMDB unavailable

---

## Feature Comparison

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Authentication | ✅ | ✅ | Both use JWT tokens |
| Group Management | ✅ | ✅ | Invite codes in both |
| TMDB Search | ✅ | ❌ | Web only (mobile uses manual entry) |
| Movie Sessions | ✅ | ✅ | Full workflow in both |
| Video Reviews | ✅ | ✅ | Upload and playback |
| Notifications | ✅ | ❌ | Web has full notification system |
| Chat | ✅ | ❌ | Web has text + video chat |
| Calendar Export | ✅ | ❌ | Web has 3 export formats |
| Real-time Updates | ✅ | ✅ | Web polls every 5s, Mobile uses pull-to-refresh |
| Responsive Design | ✅ | ✅ | Web adapts to mobile, Flutter is native |

---

## Development Tips

### Web Frontend
- Use React DevTools for debugging
- Check browser console for errors
- Network tab shows API calls
- localStorage inspection for token issues

### Mobile App
- Use Flutter DevTools: `flutter pub global activate devtools`
- Hot reload: Press `r` in terminal
- Hot restart: Press `R` in terminal
- Debug on real device for camera features

### Both
- Always run backend first
- Check backend logs for API errors
- Use Postman/curl to test API endpoints
- Keep backend and frontend in sync

---

## Next Steps

1. **Run Backend:**
   ```bash
   cd movie-suggestion-app/backend
   npm start
   ```

2. **Run Web Frontend:**
   ```bash
   cd movie-suggestion-app/frontend
   npm start
   ```

3. **Run Mobile App** (optional):
   ```bash
   cd movie-suggestion-app/mobile
   flutter run
   ```

4. **Create an Account:**
   - Register at http://localhost:3000
   - Create a group
   - Share invite code with friends
   - Start a movie session!

---

## Support

For issues:
- Check the main [README.md](README.md)
- Review [BACKEND_TESTING.md](movie-suggestion-app/BACKEND_TESTING.md)
- See [TMDB_SETUP.md](movie-suggestion-app/TMDB_SETUP.md)

---

**Happy Movie Watching! 🎬🍿**
