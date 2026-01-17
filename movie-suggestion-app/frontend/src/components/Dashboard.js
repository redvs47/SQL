import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ user, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to load groups');
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/groups', { name: groupName });
      setSuccess('Group created successfully!');
      setGroupName('');
      setShowCreateGroup(false);
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`/api/groups/${joinGroupId}/join`);
      setSuccess('Joined group successfully!');
      setJoinGroupId('');
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group');
    }
  };

  const handleGroupClick = async (groupId) => {
    try {
      // Check for active session
      const response = await axios.get(`/api/groups/${groupId}/active-session`);

      if (response.data) {
        navigate(`/session/${response.data.id}`);
      } else {
        // Create new session
        const newSession = await axios.post('/api/sessions', { groupId });
        navigate(`/session/${newSession.data.id}`);
      }
    } catch (err) {
      setError('Failed to load session');
    }
  };

  return (
    <div className="container">
      <div className="nav">
        <div>
          <h2>Welcome, {user.username}!</h2>
        </div>
        <div className="nav-links">
          <button onClick={onLogout} className="btn btn-secondary">Logout</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Your Groups</h2>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="btn btn-primary"
          >
            Create New Group
          </button>
        </div>

        {showCreateGroup && (
          <div className="card" style={{ background: '#f8f9fa', marginBottom: '20px' }}>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-success">Create</button>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ background: '#f8f9fa', marginBottom: '20px' }}>
          <form onSubmit={handleJoinGroup}>
            <div className="form-group">
              <label>Join Existing Group (Enter Group ID)</label>
              <input
                type="number"
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
                placeholder="Enter group ID to join"
                required
              />
            </div>
            <button type="submit" className="btn btn-success">Join Group</button>
          </form>
        </div>

        {groups.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
            No groups yet. Create one to get started!
          </p>
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => handleGroupClick(group.id)}
              >
                <h3>{group.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  Group ID: {group.id}
                </p>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Click to start or continue session
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
