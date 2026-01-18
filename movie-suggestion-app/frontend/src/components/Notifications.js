import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Notifications({ show, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (show) {
      loadNotifications();
    }
  }, [show]);

  const loadNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);

      const countResponse = await axios.get('/api/notifications/unread-count');
      setUnreadCount(countResponse.data.count);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`/api/notifications/${notificationId}/read`);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  if (!show) return null;

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notifications-header">
          <h2>Notifications</h2>
          <div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn btn-sm btn-primary" style={{ marginRight: '10px' }}>
                Mark all as read
              </button>
            )}
            <button onClick={onClose} className="btn btn-sm btn-secondary">Close</button>
          </div>
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No notifications yet
            </p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="notification-content">
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                  <span className="notification-time">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                {!notif.is_read && <div className="notification-badge"></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getNotificationIcon(type) {
  const icons = {
    group_invite: '📩',
    member_joined: '👋',
    member_approved: '✅',
    session_created: '🎬',
    suggestion_submitted: '💡',
    movie_selected: '🎯',
    member_watched: '👀',
    review_posted: '🎥',
    chat_message: '💬',
    deadline_reminder: '⏰',
    session_closed: '🏁',
    vote_time_created: '📅'
  };
  return icons[type] || '📌';
}

export default Notifications;
