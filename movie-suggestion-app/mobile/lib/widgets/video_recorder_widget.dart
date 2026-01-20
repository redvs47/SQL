import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class VideoRecorderWidget extends StatefulWidget {
  final int sessionId;

  const VideoRecorderWidget({super.key, required this.sessionId});

  @override
  State<VideoRecorderWidget> createState() => _VideoRecorderWidgetState();
}

class _VideoRecorderWidgetState extends State<VideoRecorderWidget> {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isRecording = false;
  bool _isInitializing = false;
  bool _isUploading = false;
  String? _errorMessage;
  int _recordingSeconds = 0;
  DateTime? _recordingStartTime;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    setState(() {
      _isInitializing = true;
      _errorMessage = null;
    });

    try {
      _cameras = await availableCameras();
      if (_cameras != null && _cameras!.isNotEmpty) {
        _cameraController = CameraController(
          _cameras!.first,
          ResolutionPreset.high,
          enableAudio: true,
        );

        await _cameraController!.initialize();

        if (mounted) {
          setState(() {
            _isInitializing = false;
          });
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to initialize camera: $e';
        _isInitializing = false;
      });
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    try {
      await _cameraController!.startVideoRecording();

      setState(() {
        _isRecording = true;
        _recordingStartTime = DateTime.now();
        _recordingSeconds = 0;
      });

      // Update recording time
      _updateRecordingTime();
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to start recording: $e';
      });
    }
  }

  void _updateRecordingTime() {
    if (_isRecording && _recordingStartTime != null) {
      Future.delayed(const Duration(seconds: 1), () {
        if (_isRecording && mounted) {
          setState(() {
            _recordingSeconds = DateTime.now().difference(_recordingStartTime!).inSeconds;
          });

          // Stop automatically at 3 minutes
          if (_recordingSeconds >= 180) {
            _stopRecording();
          } else {
            _updateRecordingTime();
          }
        }
      });
    }
  }

  Future<void> _stopRecording() async {
    if (_cameraController == null || !_isRecording) {
      return;
    }

    try {
      final file = await _cameraController!.stopVideoRecording();

      setState(() {
        _isRecording = false;
        _recordingSeconds = 0;
        _recordingStartTime = null;
      });

      // Upload the video
      _uploadVideo(File(file.path));
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to stop recording: $e';
        _isRecording = false;
      });
    }
  }

  Future<void> _pickVideo() async {
    try {
      final XFile? video = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 3),
      );

      if (video != null) {
        _uploadVideo(File(video.path));
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to pick video: $e';
      });
    }
  }

  Future<void> _uploadVideo(File videoFile) async {
    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      final apiService = context.read<ApiService>();

      await apiService.uploadReview(
        authService.token!,
        widget.sessionId,
        videoFile,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Review uploaded successfully!')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to upload video: ${e.toString()}';
        _isUploading = false;
      });
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Video Review'),
      ),
      body: _isUploading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Uploading video...'),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: _isInitializing
                      ? const Center(child: CircularProgressIndicator())
                      : _errorMessage != null
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.error_outline,
                                      size: 64,
                                      color: Colors.red,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      _errorMessage!,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Colors.red),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : _cameraController == null
                              ? const Center(child: Text('Camera not available'))
                              : Stack(
                                  children: [
                                    CameraPreview(_cameraController!),
                                    if (_isRecording)
                                      Positioned(
                                        top: 16,
                                        left: 0,
                                        right: 0,
                                        child: Center(
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 16,
                                              vertical: 8,
                                            ),
                                            decoration: BoxDecoration(
                                              color: Colors.red,
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(
                                                  Icons.fiber_manual_record,
                                                  color: Colors.white,
                                                  size: 16,
                                                ),
                                                const SizedBox(width: 8),
                                                Text(
                                                  _formatDuration(_recordingSeconds),
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                Text(
                                                  ' / 03:00',
                                                  style: TextStyle(
                                                    color: Colors.white.withValues(alpha: 0.7),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                ),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.8),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Column(
                      children: [
                        if (!_isRecording)
                          Text(
                            'Maximum video length: 3 minutes',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            // Upload from gallery
                            if (!_isRecording)
                              Column(
                                children: [
                                  FloatingActionButton(
                                    heroTag: 'upload',
                                    onPressed: _pickVideo,
                                    backgroundColor: Colors.white,
                                    child: const Icon(
                                      Icons.photo_library,
                                      color: Colors.black,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Upload',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ],
                              ),

                            // Record button
                            Column(
                              children: [
                                GestureDetector(
                                  onTap: _isRecording ? _stopRecording : _startRecording,
                                  child: Container(
                                    width: 80,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.white,
                                      border: Border.all(
                                        color: _isRecording ? Colors.red : Colors.white,
                                        width: 4,
                                      ),
                                    ),
                                    child: Center(
                                      child: Container(
                                        width: 60,
                                        height: 60,
                                        decoration: BoxDecoration(
                                          shape: _isRecording
                                              ? BoxShape.rectangle
                                              : BoxShape.circle,
                                          color: Colors.red,
                                          borderRadius: _isRecording
                                              ? BorderRadius.circular(8)
                                              : null,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _isRecording ? 'Stop' : 'Record',
                                  style: const TextStyle(color: Colors.white),
                                ),
                              ],
                            ),

                            // Placeholder for symmetry
                            if (!_isRecording)
                              const SizedBox(width: 80),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
