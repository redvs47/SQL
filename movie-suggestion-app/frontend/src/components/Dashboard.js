import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ user, onLogout }) {
  const [groups, setGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
    loadPendingRequests();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to load groups');
    }
  };

  const loadPendingRequests = async () => {
    try {
      // Load pending requests for all groups where user is leader
      const allPending = [];
      for (const group of groups) {
        if (group.is_leader) {
          const response = await axios.get(`/api/groups/${group.id}/pending`);
          allPending.push(...response.data.map(req => ({ ...req, groupId: group.id, groupName: group.name })));
        }
      }
      setPendingRequests(allPending);
    } catch (err) {
      console.error('Failed to load pending requests');
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
      await axios.post(`/api/groups/join`, { inviteCode });
      setSuccess('Join request sent! Wait for leader approval.');
      setInviteCode('');
      setTimeout(() => loadGroups(), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group');
    }
  };

  const handleApproveMember = async (groupId, userId) => {
    try {
      await axios.post(`/api/groups/${groupId}/approve/${userId}`);
      setSuccess('Member approved!');
      loadPendingRequests();
    } catch (err) {
      setError('Failed to approve member');
    }
  };

  const handleDenyMember = async (groupId, userId) => {
    try {
      await axios.post(`/api/groups/${groupId}/deny/${userId}`);
      setSuccess('Member denied');
      loadPendingRequests();
    } catch (err) {
      setError('Failed to deny member');
    }
  };

  const handleCopyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess('Invite code copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
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
              <label>Join Existing Group (Enter Invite Code)</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character invite code"
                maxLength="8"
                required
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Get an invite code from a group leader
              </p>
            </div>
            <button type="submit" className="btn btn-success">Request to Join</button>
          </form>
        </div>

        {pendingRequests.length > 0 && (
          <div className="card" style={{ background: '#fff3cd', marginBottom: '20px' }}>
            <h3>Pending Member Requests</h3>
            {pendingRequests.map((request) => (
              <div key={`${request.groupId}-${request.user_id}`} style={{
                padding: '15px',
                background: 'white',
                borderRadius: '8px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{request.username}</strong> wants to join <strong>{request.groupName}</strong>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Requested: {new Date(request.requested_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleApproveMember(request.groupId, request.user_id)}
                    className="btn btn-success"
                    style={{ padding: '5px 15px', fontSize: '14px' }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDenyMember(request.groupId, request.user_id)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 15px', fontSize: '14px' }}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                style={{ cursor: 'pointer' }}
              >
                <h3>{group.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  {group.member_count || 1} member(s)
                  {group.is_leader && <span style={{ marginLeft: '10px', color: '#28a745' }}>• Leader</span>}
                </p>
                {group.invite_code && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <code style={{
                      padding: '5px 10px',
                      background: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      letterSpacing: '2px'
                    }}>
                      {group.invite_code}
                    </code>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyInviteCode(group.invite_code);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Copy Code
                    </button>
                  </div>
                )}
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
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
