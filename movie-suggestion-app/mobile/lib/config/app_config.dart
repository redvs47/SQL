import 'dart:io';

class AppConfig {
  // API Configuration
  // The app will automatically select the correct URL based on the platform

  // For production, set this to your actual server URL
  static const String productionUrl = 'https://your-production-server.com/api';

  // Development URLs
  static const String androidEmulatorUrl = 'http://10.0.2.2:3001/api';
  static const String iosSimulatorUrl = 'http://localhost:3001/api';

  // Set to true when deploying to production
  static const bool isProduction = false;

  // Get the appropriate base URL based on platform and environment
  static String get baseUrl {
    if (isProduction) {
      return productionUrl;
    }

    // Development mode - auto-detect platform
    if (Platform.isAndroid) {
      return androidEmulatorUrl;
    } else if (Platform.isIOS) {
      return iosSimulatorUrl;
    } else {
      // Web or other platforms
      return 'http://localhost:3001/api';
    }
  }

  // For physical device testing, override with your computer's IP
  // Example: static String get baseUrl => 'http://192.168.1.100:3001/api';
}
