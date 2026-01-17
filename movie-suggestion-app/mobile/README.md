# Movie Suggestion App - Mobile (iOS & Android)

A Flutter mobile application for collaborative movie suggestions and video reviews. Works with both iOS and Android devices.

## Features

- **Full Authentication**: Register and login with secure JWT tokens
- **Group Management**: Create and join movie watching groups
- **Movie Suggestions**: Submit your movie suggestions and vote
- **Random Selection**: Automatically picks a random movie when 2+ people submit suggestions
- **Watch Date Planning**: Schedule when to watch the selected movie
- **Video Recording**: Record video reviews directly in the app (max 3 minutes)
- **Video Upload**: Upload pre-recorded videos from your gallery
- **Video Playback**: Watch reviews from all group members
- **Cross-Platform**: Single codebase for both iOS and Android

## Requirements

### Development Environment
- Flutter SDK (3.0 or higher)
- Dart SDK (included with Flutter)
- Android Studio / Xcode (depending on target platform)
- A physical device or emulator

### Backend
- The backend API server must be running (see main README)
- Update the API base URL in `lib/services/api_service.dart`

## Installation

### 1. Install Flutter

Follow the official Flutter installation guide:
- [Flutter Installation](https://docs.flutter.dev/get-started/install)

Verify installation:
```bash
flutter doctor
```

### 2. Clone and Setup

```bash
cd movie-suggestion-app/mobile
flutter pub get
```

### 3. Configure Backend URL

Edit `lib/services/api_service.dart` and update the `baseUrl`:

```dart
// For Android Emulator
static const String baseUrl = 'http://10.0.2.2:3001/api';

// For iOS Simulator
static const String baseUrl = 'http://localhost:3001/api';

// For Physical Device (replace with your computer's IP)
static const String baseUrl = 'http://192.168.1.XXX:3001/api';
```

Also update the video URL in `lib/models/video_review.dart`:

```dart
String get videoUrl {
  // For Android emulator
  return 'http://10.0.2.2:3001$videoPath';

  // For iOS simulator
  // return 'http://localhost:3001$videoPath';

  // For physical device
  // return 'http://192.168.1.XXX:3001$videoPath';
}
```

### 4. Run the App

#### For Android:
```bash
flutter run
```

#### For iOS:
```bash
cd ios
pod install
cd ..
flutter run
```

#### For specific device:
```bash
flutter devices  # List available devices
flutter run -d <device-id>
```

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart                          # App entry point
│   ├── models/                            # Data models
│   │   ├── user.dart
│   │   ├── group.dart
│   │   ├── movie_session.dart
│   │   ├── movie_suggestion.dart
│   │   └── video_review.dart
│   ├── screens/                           # UI screens
│   │   ├── login_screen.dart
│   │   ├── register_screen.dart
│   │   ├── dashboard_screen.dart
│   │   └── movie_session_screen.dart
│   ├── services/                          # Business logic
│   │   ├── auth_service.dart              # Authentication state
│   │   └── api_service.dart               # API calls
│   └── widgets/                           # Reusable widgets
│       ├── video_recorder_widget.dart     # Video recording
│       └── video_player_widget.dart       # Video playback
├── android/                               # Android specific files
├── ios/                                   # iOS specific files
├── pubspec.yaml                           # Dependencies
└── README.md                              # This file
```

## Key Dependencies

- **provider**: State management
- **http**: API requests
- **shared_preferences**: Local storage for auth tokens
- **camera**: Video recording
- **video_player**: Video playback
- **image_picker**: Gallery video selection
- **path_provider**: File system access
- **permission_handler**: Runtime permissions
- **intl**: Date formatting

## Permissions

### Android
The app requires the following permissions (configured in `android/app/src/main/AndroidManifest.xml`):
- Camera
- Microphone
- Internet
- Storage (read/write)

### iOS
The app requires the following permissions (configured in `ios/Runner/Info.plist`):
- Camera (NSCameraUsageDescription)
- Microphone (NSMicrophoneUsageDescription)
- Photo Library (NSPhotoLibraryUsageDescription)

## Usage Guide

### 1. Register/Login
- Open the app and create a new account or login
- Credentials are stored securely with JWT tokens

### 2. Create or Join Group
- Tap the floating action button to create a new group
- Or tap "Join Group" and enter an existing Group ID
- Pull down to refresh the group list

### 3. Start Movie Session
- Tap on any group to start or continue a session
- Each group maintains one active session at a time

### 4. Submit Suggestions
- Enter a movie title in the text field
- Submit your suggestion
- Wait for at least 2 people to submit suggestions

### 5. Select Movie
- Once 2+ suggestions are submitted, tap "Randomly Select Movie"
- The app will randomly pick one movie

### 6. Set Watch Date
- After selection, tap "Select Watch Date"
- Choose when your group will watch the movie

### 7. Record/Upload Review
- After watching, tap "Record or Upload Review"
- Choose to either:
  - **Record**: Record a review directly in the app (max 3 minutes)
  - **Upload**: Select a pre-recorded video from your gallery
- The video will be uploaded and shared with the group

### 8. Watch Reviews
- Scroll down to see all video reviews from group members
- Tap play to watch any review
- Use the video controls to pause, seek, or adjust volume

## Building for Production

### Android APK
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (for Google Play)
```bash
flutter build appbundle --release
```
Output: `build/app/outputs/bundle/release/app-release.aab`

### iOS
```bash
flutter build ios --release
```
Then open `ios/Runner.xcworkspace` in Xcode and archive

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted in device settings
- For Android: Check `AndroidManifest.xml` has camera permissions
- For iOS: Check `Info.plist` has camera usage description

### Cannot Connect to Backend
- Verify the backend server is running on port 3001
- Check the API base URL is correct for your device type
- For physical devices, ensure your phone and computer are on the same network
- For Android, use `10.0.2.2` instead of `localhost`
- For iOS, use `localhost` in simulator or your computer's IP on physical device

### Video Upload Fails
- Ensure video is under 3 minutes
- Check internet connection
- Verify backend upload folder has write permissions
- Check backend logs for errors

### Build Errors
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run
```

### iOS Pod Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter run
```

## Network Configuration

### Testing on Physical Devices

1. **Find your computer's IP address:**
   - macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`
   - Linux: `ip addr show`

2. **Update API URLs** in `lib/services/api_service.dart` and `lib/models/video_review.dart` with your IP address

3. **Ensure firewall allows** port 3001 connections

4. **Backend must allow CORS** for your mobile app (already configured)

## State Management

The app uses **Provider** for state management:
- `AuthService`: Manages authentication state and user session
- Authentication state is persisted using `SharedPreferences`
- JWT tokens are stored securely and sent with all API requests

## Video Features

### Recording
- Maximum duration: 3 minutes (180 seconds)
- Automatic stop when duration limit is reached
- Real-time recording timer display
- Front/back camera support

### Upload
- Select videos from device gallery
- Maximum duration: 3 minutes
- Supported formats: MP4, MOV, AVI, MKV, WebM

### Playback
- Built-in video player with controls
- Play/pause, seek, volume control
- Shows video duration and current position
- Adaptive aspect ratio

## Performance Tips

- Videos are streamed from the backend, not downloaded entirely
- Large video uploads may take time depending on network speed
- The app uses Material Design 3 for modern UI
- Images and avatars use circular caching

## Future Enhancements

Potential features to add:
- Push notifications for movie selection and watch dates
- In-app chat for group members
- Movie details integration (TMDB API)
- Social features (likes, comments on reviews)
- Offline mode for viewing downloaded reviews
- Video filters and effects
- Multiple language support

## Support

For issues or questions:
- Check the main project README
- Review Flutter documentation
- Check backend server logs

## License

MIT License - Part of the Movie Suggestion App project
