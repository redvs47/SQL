const db = require('../database');

class NotificationService {
  // Create a notification for specific users
  async createNotification(userIds, type, title, message, sessionId = null, groupId = null) {
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    const promises = userIds.map(userId => {
      return new Promise((resolve, reject) => {
        // Check if user has this notification type enabled
        db.get(
          'SELECT enabled FROM notification_preferences WHERE user_id = ? AND notification_type = ?',
          [userId, type],
          (err, pref) => {
            if (err) {
              console.error('Error checking notification preference:', err);
              // Default to enabled if preference doesn't exist
            }

            // If preference exists and is disabled, skip
            if (pref && pref.enabled === 0) {
              resolve();
              return;
            }

            // Check if group is muted
            if (groupId) {
              db.get(
                'SELECT muted FROM group_mutes WHERE user_id = ? AND group_id = ?',
                [userId, groupId],
                (err, mute) => {
                  if (err) {
                    console.error('Error checking group mute:', err);
                  }

                  // If group is muted, skip
                  if (mute && mute.muted === 1) {
                    resolve();
                    return;
                  }

                  // Create notification
                  this._insertNotification(userId, type, title, message, sessionId, groupId, resolve, reject);
                }
              );
            } else {
              // Create notification
              this._insertNotification(userId, type, title, message, sessionId, groupId, resolve, reject);
            }
          }
        );
      });
    });

    return Promise.all(promises);
  }

  _insertNotification(userId, type, title, message, sessionId, groupId, resolve, reject) {
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, session_id, group_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, sessionId, groupId],
      (err) => {
        if (err) {
          console.error('Error creating notification:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  }

  // Get all group members except the actor
  async getGroupMembers(groupId, excludeUserId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT user_id FROM group_members WHERE group_id = ?';
      const params = [groupId];

      if (excludeUserId) {
        query += ' AND user_id != ?';
        params.push(excludeUserId);
      }

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.user_id));
        }
      });
    });
  }

  // Get group leader
  async getGroupLeader(groupId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT created_by FROM groups WHERE id = ?',
        [groupId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.created_by : null);
          }
        }
      );
    });
  }

  // Notification triggers

  async notifyMovieSelected(sessionId, groupId, movieTitle) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'movie_selected',
      'Movie Selected!',
      `${movieTitle} was selected! Time to watch!`,
      sessionId,
      groupId
    );
  }

  async notifyUserWatched(sessionId, groupId, userId, username, movieTitle) {
    const members = await this.getGroupMembers(groupId, userId);
    await this.createNotification(
      members,
      'user_watched',
      'Member Watched Movie',
      `${username} marked ${movieTitle} as watched`,
      sessionId,
      groupId
    );
  }

  async notifyReviewSubmitted(sessionId, groupId, userId, username, movieTitle) {
    const members = await this.getGroupMembers(groupId, userId);
    await this.createNotification(
      members,
      'review_submitted',
      'New Review!',
      `${username} submitted their review for ${movieTitle}`,
      sessionId,
      groupId
    );
  }

  async notifyChatMessage(sessionId, groupId, userId, username, messageType) {
    const members = await this.getGroupMembers(groupId, userId);
    const message = messageType === 'video'
      ? `${username} sent a video message`
      : `${username}: New message in chat`;

    await this.createNotification(
      members,
      'chat_message',
      'New Chat Message',
      message,
      sessionId,
      groupId
    );
  }

  async notifyDeadlineWarning(sessionId, groupId, movieTitle, hoursLeft) {
    const members = await this.getGroupMembers(groupId);
    const timeStr = hoursLeft >= 24 ? `${hoursLeft / 24} day${hoursLeft / 24 > 1 ? 's' : ''}` : `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;

    await this.createNotification(
      members,
      'deadline_warning',
      'Deadline Approaching',
      `${timeStr} left to submit your review for ${movieTitle}!`,
      sessionId,
      groupId
    );
  }

  async notifyMissingReview(userId, sessionId, groupId, movieTitle) {
    await this.createNotification(
      [userId],
      'missing_review',
      'Review Reminder',
      `Don't forget to submit your review for ${movieTitle}!`,
      sessionId,
      groupId
    );
  }

  async notifyVotingOpened(sessionId, groupId, movieTitle) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'voting_opened',
      'Vote on Watch Time',
      `Vote on when to watch ${movieTitle}!`,
      sessionId,
      groupId
    );
  }

  async notifyWatchTimeSelected(sessionId, groupId, watchTime) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'watch_time_selected',
      'Watch Time Set',
      `Watch time set for ${watchTime}`,
      sessionId,
      groupId
    );
  }

  async notifyWatchTimeReminder(sessionId, groupId, movieTitle, timeUntil) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'watch_time_reminder',
      'Watch Party Soon',
      `${movieTitle} watch party starts in ${timeUntil}!`,
      sessionId,
      groupId
    );
  }

  async notifyPendingMember(groupId, username) {
    const leaderId = await this.getGroupLeader(groupId);
    if (leaderId) {
      await this.createNotification(
        [leaderId],
        'pending_member',
        'New Join Request',
        `${username} wants to join your group`,
        null,
        groupId
      );
    }
  }

  async notifyMemberApproved(userId, groupId, groupName) {
    await this.createNotification(
      [userId],
      'member_approved',
      'Accepted!',
      `You were accepted to ${groupName}!`,
      null,
      groupId
    );

    // Also notify all members
    const members = await this.getGroupMembers(groupId, userId);
    const user = await this._getUsername(userId);
    await this.createNotification(
      members,
      'member_joined',
      'New Member',
      `Welcome ${user} to the group!`,
      null,
      groupId
    );
  }

  async notifyMemberDenied(userId, groupName) {
    await this.createNotification(
      [userId],
      'member_denied',
      'Join Request Declined',
      `Your request to join ${groupName} was declined`,
      null,
      null
    );
  }

  async notifyDeadlineExtended(sessionId, groupId, newDeadline) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'deadline_extended',
      'Deadline Extended',
      `Deadline extended to ${newDeadline}`,
      sessionId,
      groupId
    );
  }

  async notifySessionClosed(sessionId, groupId, movieTitle) {
    const members = await this.getGroupMembers(groupId);
    await this.createNotification(
      members,
      'session_closed',
      'Session Closed',
      `Session for ${movieTitle} has been closed`,
      sessionId,
      groupId
    );
  }

  async _getUsername(userId) {
    return new Promise((resolve) => {
      db.get('SELECT username FROM users WHERE id = ?', [userId], (err, row) => {
        resolve(row ? row.username : 'Someone');
      });
    });
  }
}

module.exports = new NotificationService();
