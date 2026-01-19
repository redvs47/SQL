import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/http.dart';
import '../models/user.dart';
import '../models/group.dart';
import '../models/movie_session.dart';
import '../models/movie_suggestion.dart';
import '../models/video_review.dart';

class ApiService {
  // Change this to your backend URL
  // For Android emulator: http://10.0.2.2:3001
  // For iOS simulator: http://localhost:3001
  // For physical device: http://YOUR_IP_ADDRESS:3001
  static const String baseUrl = 'http://10.0.2.2:3001/api';

  Map<String, String> _headers(String? token) {
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Authentication
  Future<Map<String, dynamic>> register(
    String username,
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers(null),
      body: json.encode({
        'username': username,
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Registration failed');
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers(null),
      body: json.encode({
        'username': username,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Login failed');
    }
  }

  // Groups
  Future<List<Group>> getGroups(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/groups'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Group.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load groups');
    }
  }

  Future<Group> createGroup(String token, String name) async {
    final response = await http.post(
      Uri.parse('$baseUrl/groups'),
      headers: _headers(token),
      body: json.encode({'name': name}),
    );

    if (response.statusCode == 201) {
      return Group.fromJson(json.decode(response.body));
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to create group');
    }
  }

  Future<void> joinGroup(String token, String inviteCode) async {
    final response = await http.post(
      Uri.parse('$baseUrl/groups/join/$inviteCode'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to join group');
    }
  }

  // Sessions
  Future<MovieSession?> getActiveSession(String token, int groupId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/groups/$groupId/active-session'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data == null) return null;
      return MovieSession.fromJson(data);
    } else {
      throw Exception('Failed to load session');
    }
  }

  Future<MovieSession> createSession(String token, int groupId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sessions'),
      headers: _headers(token),
      body: json.encode({'groupId': groupId}),
    );

    if (response.statusCode == 201) {
      final data = json.decode(response.body);
      // Return a minimal session object with the ID
      return MovieSession(
        id: data['id'],
        groupId: groupId,
        status: 'collecting_suggestions',
        createdAt: DateTime.now().toIso8601String(),
      );
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to create session');
    }
  }

  Future<MovieSession> getSession(String token, int sessionId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/sessions/$sessionId'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return MovieSession.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load session');
    }
  }

  // Suggestions
  Future<List<MovieSuggestion>> getSuggestions(
    String token,
    int sessionId,
  ) async {
    final response = await http.get(
      Uri.parse('$baseUrl/sessions/$sessionId/suggestions'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => MovieSuggestion.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load suggestions');
    }
  }

  Future<void> submitSuggestion(
    String token,
    int sessionId,
    String movieTitle,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sessions/$sessionId/suggestions'),
      headers: _headers(token),
      body: json.encode({'movieTitle': movieTitle}),
    );

    if (response.statusCode != 201) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to submit suggestion');
    }
  }

  Future<String> selectMovie(String token, int sessionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sessions/$sessionId/select-movie'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['selectedMovie'];
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to select movie');
    }
  }

  Future<void> setWatchDate(String token, int sessionId, String date) async {
    final response = await http.post(
      Uri.parse('$baseUrl/sessions/$sessionId/watch-date'),
      headers: _headers(token),
      body: json.encode({'watchDate': date}),
    );

    if (response.statusCode != 200) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to set watch date');
    }
  }

  // Reviews
  Future<List<VideoReview>> getReviews(String token, int sessionId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/sessions/$sessionId/reviews'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => VideoReview.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load reviews');
    }
  }

  Future<void> uploadReview(
    String token,
    int sessionId,
    File videoFile,
  ) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/sessions/$sessionId/reviews'),
    );

    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(
      await http.MultipartFile.fromPath('video', videoFile.path),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 201) {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Failed to upload review');
    }
  }
}
