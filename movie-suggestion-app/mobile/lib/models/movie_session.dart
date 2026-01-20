import 'dart:ui';

class MovieSession {
  final int id;
  final int groupId;
  final String status;
  final int? selectedMovieId;
  final String? selectedMovieTitle;
  final String? watchDate;
  final String createdAt;

  MovieSession({
    required this.id,
    required this.groupId,
    required this.status,
    this.selectedMovieId,
    this.selectedMovieTitle,
    this.watchDate,
    required this.createdAt,
  });

  factory MovieSession.fromJson(Map<String, dynamic> json) {
    return MovieSession(
      id: json['id'],
      groupId: json['group_id'],
      status: json['status'],
      selectedMovieId: json['selected_movie_id'],
      selectedMovieTitle: json['selected_movie_title'],
      watchDate: json['watch_date'],
      createdAt: json['created_at'],
    );
  }

  String get statusLabel {
    switch (status) {
      case 'collecting_suggestions':
        return 'Collecting Suggestions';
      case 'movie_selected':
        return 'Movie Selected';
      case 'watching':
        return 'Watching';
      case 'reviewed':
        return 'Reviewed';
      default:
        return status;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'collecting_suggestions':
        return const Color(0xFFFFC107);
      case 'movie_selected':
        return const Color(0xFF17A2B8);
      case 'watching':
        return const Color(0xFF28A745);
      case 'reviewed':
        return const Color(0xFF6C757D);
      default:
        return const Color(0xFF6C757D);
    }
  }
}
