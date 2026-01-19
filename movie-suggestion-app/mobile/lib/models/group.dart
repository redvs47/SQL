class Group {
  final int id;
  final String name;
  final int createdBy;
  final String createdAt;
  final String? inviteCode;
  final int? memberCount;

  Group({
    required this.id,
    required this.name,
    required this.createdBy,
    required this.createdAt,
    this.inviteCode,
    this.memberCount,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'],
      name: json['name'],
      createdBy: json['created_by'],
      createdAt: json['created_at'],
      inviteCode: json['invite_code'],
      memberCount: json['member_count'],
    );
  }
}
