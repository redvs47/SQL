import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

class AuthService extends ChangeNotifier {
  final SharedPreferences _prefs;
  String? _token;
  User? _user;

  AuthService(this._prefs) {
    _loadToken();
  }

  bool get isAuthenticated => _token != null;
  String? get token => _token;
  User? get user => _user;

  void _loadToken() {
    _token = _prefs.getString('token');
    final userJson = _prefs.getString('user');
    if (userJson != null) {
      _user = User.fromJson(json.decode(userJson));
    }
  }

  Future<void> setAuth(String token, User user) async {
    _token = token;
    _user = user;
    await _prefs.setString('token', token);
    await _prefs.setString('user', json.encode(user.toJson()));
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _prefs.remove('token');
    await _prefs.remove('user');
    notifyListeners();
  }
}
