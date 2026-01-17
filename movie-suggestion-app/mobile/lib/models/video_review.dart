class VideoReview {
  final int id;
  final int sessionId;
  final int userId;
  final String videoPath;
  final String username;
  final String createdAt;

  VideoReview({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.videoPath,
    required this.username,
    required this.createdAt,
  });

  factory VideoReview.fromJson(Map<String, dynamic> json) {
    return VideoReview(
      id: json['id'],
      sessionId: json['session_id'],
      userId: json['user_id'],
      videoPath: json['video_path'],
      username: json['username'],
      createdAt: json['created_at'],
    );
  }

  String get videoUrl {
    // Adjust this URL to match your backend server
    return 'http://10.0.2.2:3001$videoPath'; // For Android emulator
    // For iOS simulator use: http://localhost:3001$videoPath
    // For physical device use: http://YOUR_IP:3001$videoPath
  }
}
