class MovieSuggestion {
  final int id;
  final int sessionId;
  final int userId;
  final String movieTitle;
  final String username;
  final String createdAt;

  MovieSuggestion({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.movieTitle,
    required this.username,
    required this.createdAt,
  });

  factory MovieSuggestion.fromJson(Map<String, dynamic> json) {
    return MovieSuggestion(
      id: json['id'],
      sessionId: json['session_id'],
      userId: json['user_id'],
      movieTitle: json['movie_title'],
      username: json['username'],
      createdAt: json['created_at'],
    );
  }
}
