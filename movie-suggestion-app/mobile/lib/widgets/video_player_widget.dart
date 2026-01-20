import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class VideoPlayerWidget extends StatefulWidget {
  final String videoUrl;

  const VideoPlayerWidget({super.key, required this.videoUrl});

  @override
  State<VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      _controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
      );

      await _controller.initialize();

      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }

      _controller.addListener(() {
        if (mounted) {
          setState(() {});
        }
      });
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        height: 200,
        color: Colors.black,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error, color: Colors.white, size: 48),
              const SizedBox(height: 8),
              const Text(
                'Error loading video',
                style: TextStyle(color: Colors.white),
              ),
              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return Container(
        height: 200,
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return AspectRatio(
      aspectRatio: _controller.value.aspectRatio,
      child: Stack(
        alignment: Alignment.center,
        children: [
          VideoPlayer(_controller),
          // Play/Pause overlay
          if (!_controller.value.isPlaying || _controller.value.position == _controller.value.duration)
            GestureDetector(
              onTap: () {
                setState(() {
                  if (_controller.value.position == _controller.value.duration) {
                    _controller.seekTo(Duration.zero);
                  }
                  _controller.play();
                });
              },
              child: Container(
                color: Colors.black.withValues(alpha: 0.3),
                child: const Center(
                  child: Icon(
                    Icons.play_circle_outline,
                    size: 64,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          // Controls
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(
                          _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                          color: Colors.white,
                        ),
                        onPressed: () {
                          setState(() {
                            if (_controller.value.isPlaying) {
                              _controller.pause();
                            } else {
                              if (_controller.value.position == _controller.value.duration) {
                                _controller.seekTo(Duration.zero);
                              }
                              _controller.play();
                            }
                          });
                        },
                      ),
                      Text(
                        _formatDuration(_controller.value.position),
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      Expanded(
                        child: Slider(
                          value: _controller.value.position.inSeconds.toDouble(),
                          max: _controller.value.duration.inSeconds.toDouble(),
                          onChanged: (value) {
                            _controller.seekTo(Duration(seconds: value.toInt()));
                          },
                          activeColor: Colors.white,
                          inactiveColor: Colors.white.withValues(alpha: 0.3),
                        ),
                      ),
                      Text(
                        _formatDuration(_controller.value.duration),
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      IconButton(
                        icon: Icon(
                          _controller.value.volume > 0 ? Icons.volume_up : Icons.volume_off,
                          color: Colors.white,
                        ),
                        onPressed: () {
                          setState(() {
                            _controller.setVolume(_controller.value.volume > 0 ? 0 : 1);
                          });
                        },
                      ),
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
