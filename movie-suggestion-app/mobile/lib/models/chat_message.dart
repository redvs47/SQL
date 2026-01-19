class ChatMessage {
  final int id;
  final int sessionId;
  final int userId;
  final String username;
  final String? message;
  final String? videoPath;
  final String createdAt;

  ChatMessage({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.username,
    this.message,
    this.videoPath,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      sessionId: json['session_id'],
      userId: json['user_id'],
      username: json['username'],
      message: json['message'],
      videoPath: json['video_path'],
      createdAt: json['created_at'],
    );
  }

  bool get isTextMessage => message != null && message!.isNotEmpty;
  bool get isVideoMessage => videoPath != null && videoPath!.isNotEmpty;

  String get videoUrl {
    // Use the same base URL configuration as other video models
    // For Android emulator: http://10.0.2.2:3001
    // For iOS simulator: http://localhost:3001
    // For physical device: http://YOUR_IP:3001
    const String baseUrl = 'http://10.0.2.2:3001';
    return '$baseUrl$videoPath';
  }
}
