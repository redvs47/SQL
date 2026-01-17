import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/movie_session.dart';
import '../models/movie_suggestion.dart';
import '../models/video_review.dart';
import '../widgets/video_recorder_widget.dart';
import '../widgets/video_player_widget.dart';

class MovieSessionScreen extends StatefulWidget {
  final int sessionId;

  const MovieSessionScreen({super.key, required this.sessionId});

  @override
  State<MovieSessionScreen> createState() => _MovieSessionScreenState();
}

class _MovieSessionScreenState extends State<MovieSessionScreen> {
  MovieSession? _session;
  List<MovieSuggestion> _suggestions = [];
  List<VideoReview> _reviews = [];
  bool _isLoading = true;
  String? _errorMessage;

  final _movieTitleController = TextEditingController();
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _movieTitleController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await Future.wait([
      _loadSession(),
      _loadSuggestions(),
      _loadReviews(),
    ]);
  }

  Future<void> _loadSession() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      final session = await apiService.getSession(
        authService.token!,
        widget.sessionId,
      );

      setState(() {
        _session = session;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadSuggestions() async {
    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      final suggestions = await apiService.getSuggestions(
        authService.token!,
        widget.sessionId,
      );

      setState(() {
        _suggestions = suggestions;
      });
    } catch (e) {
      // Ignore error - suggestions might not exist yet
    }
  }

  Future<void> _loadReviews() async {
    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      final reviews = await apiService.getReviews(
        authService.token!,
        widget.sessionId,
      );

      setState(() {
        _reviews = reviews;
      });
    } catch (e) {
      // Ignore error - reviews might not exist yet
    }
  }

  Future<void> _submitSuggestion() async {
    if (_movieTitleController.text.isEmpty) return;

    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      await apiService.submitSuggestion(
        authService.token!,
        widget.sessionId,
        _movieTitleController.text,
      );

      _movieTitleController.clear();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Suggestion submitted!')),
        );
        _loadSuggestions();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _selectMovie() async {
    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      final selectedMovie = await apiService.selectMovie(
        authService.token!,
        widget.sessionId,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Selected: $selectedMovie')),
        );
        _loadSession();
        _loadSuggestions();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _setWatchDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (date == null) return;

    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      final dateStr = DateFormat('yyyy-MM-dd').format(date);

      await apiService.setWatchDate(
        authService.token!,
        widget.sessionId,
        dateStr,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Watch date set!')),
        );
        _loadSession();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _recordOrUploadVideo() async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => VideoRecorderWidget(sessionId: widget.sessionId),
      ),
    );

    if (result == true) {
      _loadReviews();
      _loadSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final userHasSuggested = _suggestions.any((s) => s.userId == authService.user?.id);
    final canSelectMovie = _suggestions.length >= 2 && _session?.status == 'collecting_suggestions';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Movie Session'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_errorMessage'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Status Card
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Session Status',
                                      style: Theme.of(context).textTheme.titleLarge,
                                    ),
                                    Chip(
                                      label: Text(
                                        _session?.statusLabel ?? '',
                                        style: const TextStyle(color: Colors.white),
                                      ),
                                      backgroundColor: _session?.statusColor,
                                    ),
                                  ],
                                ),
                                if (_session?.selectedMovieTitle != null) ...[
                                  const SizedBox(height: 16),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Selected Movie',
                                          style: TextStyle(
                                            color: Colors.blue.shade900,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _session!.selectedMovieTitle!,
                                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                                color: Colors.blue.shade900,
                                              ),
                                        ),
                                        if (_session?.watchDate != null) ...[
                                          const SizedBox(height: 8),
                                          Text(
                                            'Watch Date: ${_session!.watchDate}',
                                            style: TextStyle(color: Colors.blue.shade700),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Step 1: Suggestions
                        if (_session?.status == 'collecting_suggestions') ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Submit Movie Suggestion',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: 16),
                                  if (!userHasSuggested)
                                    TextField(
                                      controller: _movieTitleController,
                                      decoration: const InputDecoration(
                                        labelText: 'Movie Title',
                                        hintText: 'Enter a movie title',
                                      ),
                                      onSubmitted: (_) => _submitSuggestion(),
                                    )
                                  else
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade50,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: Colors.green.shade200),
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(Icons.check_circle, color: Colors.green.shade700),
                                          const SizedBox(width: 8),
                                          Text(
                                            'You have submitted a suggestion!',
                                            style: TextStyle(color: Colors.green.shade900),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (!userHasSuggested) ...[
                                    const SizedBox(height: 8),
                                    ElevatedButton(
                                      onPressed: _submitSuggestion,
                                      child: const Text('Submit'),
                                    ),
                                  ],
                                  const SizedBox(height: 24),
                                  Text(
                                    'Current Suggestions (${_suggestions.length})',
                                    style: Theme.of(context).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 8),
                                  if (_suggestions.isEmpty)
                                    Text(
                                      'No suggestions yet. Be the first!',
                                      style: TextStyle(color: Colors.grey[600]),
                                    )
                                  else
                                    ..._suggestions.map((suggestion) => ListTile(
                                          contentPadding: EdgeInsets.zero,
                                          leading: const Icon(Icons.movie),
                                          title: Text(suggestion.movieTitle),
                                          subtitle: Text('by ${suggestion.username}'),
                                        )),
                                  if (canSelectMovie) ...[
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      onPressed: _selectMovie,
                                      icon: const Icon(Icons.shuffle),
                                      label: const Text('Randomly Select Movie'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.green,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ],

                        // Step 2: Set Watch Date
                        if (_session?.status == 'movie_selected' && _session?.watchDate == null) ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Set Watch Date',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'When will you watch "${_session?.selectedMovieTitle}"?',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: _setWatchDate,
                                    icon: const Icon(Icons.calendar_today),
                                    label: const Text('Select Watch Date'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],

                        // Step 3: Submit Video Review
                        if (_session?.status == 'watching' || _session?.status == 'reviewed') ...[
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    'Video Review',
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Have you finished watching "${_session?.selectedMovieTitle}"?',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Record or upload your video review (max 3 minutes)',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: _recordOrUploadVideo,
                                    icon: const Icon(Icons.videocam),
                                    label: const Text('Record or Upload Review'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.red,
                                      foregroundColor: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Reviews List
                          Text(
                            'Reviews from Group Members',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          if (_reviews.isEmpty)
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(32),
                                child: Center(
                                  child: Text(
                                    'No reviews yet. Be the first to share!',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                ),
                              ),
                            )
                          else
                            ..._reviews.map((review) => Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Row(
                                          children: [
                                            CircleAvatar(
                                              child: Text(review.username[0].toUpperCase()),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    review.username,
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                  Text(
                                                    DateFormat.yMMMd().format(
                                                      DateTime.parse(review.createdAt),
                                                    ),
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      color: Colors.grey[600],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      VideoPlayerWidget(videoUrl: review.videoUrl),
                                    ],
                                  ),
                                )),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }
}
