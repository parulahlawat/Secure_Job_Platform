import React, { useEffect, useState, useRef } from 'react'

import { useNavigate } from 'react-router-dom';
import { messagesAPI, profilesAPI } from '../services/api';
import { groupAPI } from '../services/group';
import { encryptionService } from '../services/encryption';
import toast from 'react-hot-toast';

export default function Messages() {
    // Store latest sender public keys for decryption (senderId -> publicKey)
    const [senderKeys, setSenderKeys] = useState({});
  // Ref for chat messages list div (must be declared before JSX)
  const chatMessagesListDivRef = useRef(null);

  // Debug UI state (removed)

    // Regenerate and save new keypair for current user
    const handleRegenerateKeys = async () => {
      try {
        const keypair = encryptionService.generateKeyPair();
        const publicKey = encryptionService.getPublicKey(keypair);
        const secretKey = encryptionService.getSecretKey(keypair);
        localStorage.setItem('publicKey', publicKey);
        localStorage.setItem('secretKey', secretKey);
        await profilesAPI.update({ public_key: publicKey });
        toast.success('Encryption keys regenerated and saved!');
      } catch (e) {
        toast.error('Failed to regenerate keys');
      }
    };
  const navigate = useNavigate();
  // Robustly get myId from localStorage or sessionStorage, with debug
  let myId = null;
  // Try direct user_id key
  if (localStorage.getItem('user_id')) {
    myId = parseInt(localStorage.getItem('user_id'));
  } else if (sessionStorage.getItem('user_id')) {
    myId = parseInt(sessionStorage.getItem('user_id'));
  } else {
    // Try extracting from user or profile object in storage
    let userObj = null;
    if (localStorage.getItem('user')) {
      try {
        userObj = JSON.parse(localStorage.getItem('user'));
      } catch {}
    } else if (sessionStorage.getItem('user')) {
      try {
        userObj = JSON.parse(sessionStorage.getItem('user'));
      } catch {}
    } else if (localStorage.getItem('profile')) {
      try {
        userObj = JSON.parse(localStorage.getItem('profile'));
      } catch {}
    } else if (sessionStorage.getItem('profile')) {
      try {
        userObj = JSON.parse(sessionStorage.getItem('profile'));
      } catch {}
    }
    if (userObj && (userObj.id || userObj.user_id)) {
      myId = parseInt(userObj.id || userObj.user_id);
      console.log('[myId DEBUG] myId loaded from user/profile object:', myId);
    }
  }
  if (!myId || isNaN(myId)) {
    console.warn('[myId DEBUG] user_id not found in storage or user/profile object! myId:', myId);
  } else {
    console.log('[myId DEBUG] myId loaded:', myId);
  }
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Group chat state
  const [tab, setTab] = useState('direct'); // 'direct' or 'group'
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  // Fetch my own profile for encryption
  useEffect(() => {
    async function fetchMyProfile() {
      try {
        const res = await profilesAPI.getMe();
        setMyProfile(res.data);
      } catch (err) {
        setMyProfile(null);
      }
    }
    fetchMyProfile();
  }, [myId]);

  // Fetch conversations, users, and groups
  useEffect(() => {
    async function fetchAll() {
      try {
        const [convoRes, usersRes, groupsRes] = await Promise.all([
          messagesAPI.getConversations(),
          profilesAPI.getAll(),
          groupAPI.list()
        ]);
        let otherUsers = (convoRes.data || []).filter(u => u.id !== myId);
        // Sort by last_message.timestamp descending (most recent first)
        otherUsers = otherUsers.sort((a, b) => {
          const aTime = a.last_message && a.last_message.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
          const bTime = b.last_message && b.last_message.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
          return bTime - aTime;
        });
        setConversations(otherUsers);
        // All users except Admins (include self for avatar logic)
        // Patch: ensure each user has id = user_id for avatar logic
        const allUsers = (usersRes.data || [])
          .filter(u => u.role !== 'admin')
          .map(u => ({ ...u, id: u.user_id }));
        setUsers(allUsers);
        setGroups(groupsRes.data || []);
      } catch (err) {
        setError('Failed to load conversations, users, or groups');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [myId]);

  // Fetch messages for selected user
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedUser) return;
      setLoading(true);
      try {
        // Mark all messages as read when opening chat
        await messagesAPI.markAllRead(selectedUser.id);
        const res = await messagesAPI.getWith(selectedUser.id);
        let msgs = res.data || [];
        msgs = [...msgs].sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return new Date(a.timestamp) - new Date(b.timestamp);
          }
          return (a.id || 0) - (b.id || 0);
        });
        setMessages(msgs);

        // Fetch latest sender keys for all unique senders in these messages (except self)
        const uniqueSenderIds = Array.from(new Set(msgs.map(m => (m.sender_id ?? m.from_user_id)).filter(id => id && id !== myId)));
        const newSenderKeys = {};
        await Promise.all(uniqueSenderIds.map(async (sid) => {
          try {
            const res = await profilesAPI.get(sid);
            newSenderKeys[sid] = res.data.public_key;
          } catch {
            newSenderKeys[sid] = null;
          }
        }));
        setSenderKeys(newSenderKeys);
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [selectedUser]);

  // Fetch group messages for selected group
  useEffect(() => {
    async function fetchGroupMessages() {
      if (!selectedGroup) return;
      setLoading(true);
      try {
        const res = await groupAPI.getMessages(selectedGroup.id);
        let msgs = res.data || [];
        setGroupMessages(msgs);
      } catch (err) {
        setError('Failed to load group messages');
      } finally {
        setLoading(false);
      }
    }
    fetchGroupMessages();
  }, [selectedGroup]);

  // Send a direct message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser) return;
    try {
      // Always fetch the latest recipient public key before sending
      const userProfileRes = await profilesAPI.get(selectedUser.id);
      const recipientPublicKey = userProfileRes.data.public_key || selectedUser.public_key;
      const senderSecretKey = localStorage.getItem('secretKey');
      if (!recipientPublicKey || !senderSecretKey) {
        toast.error('Missing encryption keys. Cannot send message securely.');
        return;
      }
      const ciphertext = encryptionService.encryptMessage(input, recipientPublicKey, senderSecretKey);
      const res = await messagesAPI.send({ recipient_id: selectedUser.id, ciphertext });
      setMessages(prev => [...prev, res.data]);
      setInput('');
      // Refresh users list after sending a message (in case new user info is missing)
      try {
        const usersRes = await profilesAPI.getAll();
        const allUsers = (usersRes.data || [])
          .filter(u => u.role !== 'admin')
          .map(u => ({ ...u, id: u.user_id }));
        setUsers(allUsers);
      } catch {}
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  // Send a group message
  const handleSendGroup = async (e) => {
    e.preventDefault();
    console.log("handleSendGroup called", { input, selectedGroup });
    if (!input.trim() || !selectedGroup || !myProfile) return;
    try {
      const senderSecretKey = localStorage.getItem('secretKey');
      const myUserId = myProfile.id;
      // Get all group member user IDs (including self)
      const memberIds = selectedGroup.members;
      // Map: user_id -> public_key
      const memberPublicKeys = {};
      users.forEach(u => {
        if (memberIds.includes(u.id)) {
          memberPublicKeys[u.id] = u.public_key;
        }
      });
      // Add self if not in users list
      if (!memberPublicKeys[myUserId] && myProfile.public_key) {
        memberPublicKeys[myUserId] = myProfile.public_key;
      }
      // Encrypt message for each member
      const ciphertexts = {};
      Object.entries(memberPublicKeys).forEach(([uid, pubkey]) => {
        ciphertexts[uid] = encryptionService.encryptMessage(input, pubkey, senderSecretKey);
      });
      // Send all ciphertexts as a mapping
      console.log("Sending group message", selectedGroup.id, { group_id: selectedGroup.id, ciphertexts });
      const res = await groupAPI.sendMessage(selectedGroup.id, { group_id: selectedGroup.id, ciphertexts });
      setGroupMessages(prev => [...prev, res.data]);
      setInput('');
    } catch (err) {
      console.error("Group message send error", err);
      toast.error('Failed to send group message');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Debug UI Panel */}
  {/* Debug UI removed */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Messages</h1>
          {/* Regenerate Keys button hidden for normal users */}
        </div>
      </nav>
      <div className="flex flex-1 max-w-7xl mx-auto w-full h-[80vh] bg-white rounded-lg shadow mt-8 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/3 border-r bg-gray-50 overflow-y-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded text-sm font-semibold ${tab === 'direct' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => { setTab('direct'); setSelectedGroup(null); }}
              >
                Direct
              </button>
              <button
                className={`px-3 py-1 rounded text-sm font-semibold ${tab === 'group' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => { setTab('group'); setSelectedUser(null); }}
              >
                Groups
              </button>
            </div>
            {tab === 'direct' && (
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                onClick={() => setShowAllUsers(s => !s)}
              >
                {showAllUsers ? 'Back to Chats' : 'Start New Chat'}
              </button>
            )}
            {tab === 'group' && (
              <button
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                onClick={() => setShowCreateGroup(s => !s)}
              >
                {showCreateGroup ? 'Back to Groups' : 'Create Group'}
              </button>
            )}
          </div>
          {/* Direct messages tab */}
          {tab === 'direct' && (
            loading ? (
              <p className="p-4">Loading...</p>
            ) : error ? (
              <p className="p-4 text-red-500">{error}</p>
            ) : showAllUsers ? (
              <>
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold">Start New Chat</h2>
                  <button
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                    onClick={() => setShowAllUsers(false)}
                  >
                    Back to Chats
                  </button>
                </div>
                <ul>
                  {users.filter(u => !conversations.some(c => c.id === u.id)).map(user => (
                    <li
                      key={user.id}
                      className={`p-4 cursor-pointer hover:bg-blue-50`}
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAllUsers(false);
                        setSelectedGroup(null);
                      }}
                    >
                      <div className="font-medium">{user.full_name || user.email}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </li>
                  ))}
                  {users.filter(u => !conversations.some(c => c.id === u.id)).length === 0 && (
                    <li className="p-4 text-gray-500">No new users available.</li>
                  )}
                </ul>
              </>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-gray-500">No conversations yet.</p>
            ) : (
              <ul>
                {conversations.map(user => (
                  <li
                    key={user.id}
                    className={`p-4 cursor-pointer flex items-center justify-between hover:bg-blue-50 ${selectedUser && selectedUser.id === user.id ? 'bg-blue-100' : ''}`}
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedGroup(null);
                    }}
                  >
                    <div>
                      <div className="font-medium">{user.full_name || user.email}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                      {user.last_message && user.last_message.timestamp && (
                        <div className="text-xs text-gray-400 mt-1">
                          Last: {new Date(user.last_message.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {user.unread_count > 0 && user.last_message && user.last_message.sender_id !== myId && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {user.unread_count}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}
          {/* Groups tab */}
          {tab === 'group' && (
            showCreateGroup ? (
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">Create Group</h2>
                <input
                  className="border rounded px-2 py-1 w-full mb-2"
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
                <div className="mb-2">Add members:</div>
                <ul className="mb-2 max-h-32 overflow-y-auto">
                  {users.map(u => (
                    <li key={u.id} className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={newGroupMembers.includes(u.id)}
                        onChange={e => {
                          if (e.target.checked) setNewGroupMembers(m => [...m, u.id]);
                          else setNewGroupMembers(m => m.filter(id => id !== u.id));
                        }}
                      />
                      <span>{u.full_name ? `${u.full_name} (${u.email})` : u.email}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
                  onClick={async () => {
                    try {
                      await groupAPI.create({ name: newGroupName, member_ids: newGroupMembers });
                      setShowCreateGroup(false);
                      setNewGroupName('');
                      setNewGroupMembers([]);
                      // Refresh groups
                      const groupsRes = await groupAPI.list();
                      setGroups(groupsRes.data || []);
                      toast.success('Group created!');
                    } catch {
                      toast.error('Failed to create group');
                    }
                  }}
                  disabled={!newGroupName.trim()}
                >
                  Create Group
                </button>
              </div>
            ) : groups.length === 0 ? (
              <p className="p-4 text-gray-500">No groups yet.</p>
            ) : (
              <ul>
                {groups.map(group => (
                  <li
                    key={group.id}
                    className={`p-4 cursor-pointer hover:bg-green-50 ${selectedGroup && selectedGroup.id === group.id ? 'bg-green-100' : ''}`}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedUser(null);
                    }}
                  >
                    <div className="font-medium">{group.name}</div>
                    <div className="text-xs text-gray-500">Members: {group.members.length}</div>
                  </li>
                ))}
              </ul>
            )
          )}
        </aside>
        {/* Main chat window */}
        <main className="flex-1 flex flex-col">
          {/* Direct chat */}
          {tab === 'direct' && (!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start chatting.
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="border-b p-3 font-semibold text-lg bg-gray-50">{selectedUser.full_name || selectedUser.email}</div>
              <div
                className="flex-1 overflow-y-auto px-3 py-2"
                style={{ minHeight: 0 }}
                ref={chatMessagesListDivRef}
              >
                {(() => {
                  // Filter out recruiter-to-applicant messages from applicant's chat view
                  let filteredMessages = messages;
                  // Find roles for current user and selected user
                  const myProfileObj = users.find(u => u.id === myId) || myProfile;
                  const selectedUserProfile = users.find(u => u.id === (selectedUser?.id)) || selectedUser;
                  const isMeApplicant = myProfileObj?.role === 'user';
                  const isOtherRecruiter = selectedUserProfile?.role === 'recruiter';
                  if (isMeApplicant && isOtherRecruiter) {
                    // Only show messages sent by the applicant (me)
                    filteredMessages = messages.filter(msg => {
                      // Only show if I sent it, or if the sender is not a recruiter
                      const senderId = msg.sender_id ?? msg.from_user_id;
                      return Number(senderId) === Number(myId);
                    });
                  }
                  if (filteredMessages.length === 0) {
                    return <p className="text-gray-500">No messages yet.</p>;
                  }
                  return (
                    <ul className="chat-messages-list">
                      {filteredMessages.map((msg, idx) => {
                        let decrypted = '[Unable to decrypt]';
                        let senderId = msg.sender_id ?? msg.from_user_id;
                        let isMine = Number(senderId) === Number(myId);
                        const mySecretKey = localStorage.getItem('secretKey');
                        try {
                          if (isMine) {
                            decrypted = encryptionService.decryptMessage(
                              msg.ciphertext,
                              selectedUser.public_key,
                              mySecretKey
                            );
                          } else {
                            // Always use the latest fetched public key for sender
                            const senderKey = senderKeys[senderId] || msg.from_user_public_key || (msg.from_user && msg.from_user.public_key);
                            if (senderKey && mySecretKey) {
                              decrypted = encryptionService.decryptMessage(
                                msg.ciphertext,
                                senderKey,
                                mySecretKey
                              );
                            }
                          }
                        } catch (e) {
                          decrypted = '[Unable to decrypt]';
                        }
                        // Avatar/initials
                        let avatar = '';
                        if (isMine) {
                          const myProfile = users.find(u => u.id === myId) || myProfile;
                          if (myProfile?.full_name && myProfile.full_name.trim().length > 0) {
                            avatar = myProfile.full_name.trim()[0].toUpperCase();
                          } else if (myProfile?.email && myProfile.email.trim().length > 0) {
                            avatar = myProfile.email.trim()[0].toUpperCase();
                          } else {
                            avatar = '?';
                          }
                        } else {
                          const senderId = msg.from_user_id ?? msg.sender_id;
                          let senderProfile = users.find(u => u.id === senderId);
                          // Fallback to message fields if not found in users
                          let fullName = senderProfile?.full_name || msg.from_user?.full_name || msg.full_name || msg.sender_name || '';
                          let email = senderProfile?.email || msg.from_user?.email || msg.email || msg.sender_email || '';
                          if (fullName && fullName.trim().length > 0) {
                            avatar = fullName.trim()[0].toUpperCase();
                          } else if (email && email.trim().length > 0) {
                            avatar = email.trim()[0].toUpperCase();
                          } else {
                            avatar = '?';
                          }
                        }
                        const rowClass = `chat-message-row ${isMine ? 'sent' : 'received'}`;
                        return (
                          <li key={msg.id} className={rowClass}>
                            <div className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} items-center`}>
                              {!isMine && (
                                <div className="flex items-end mr-2" style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1rem' }}>
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    {avatar}
                                  </div>
                                </div>
                              )}
                              <span className={`chat-bubble ${isMine ? 'sent-bubble' : 'received-bubble'}`}>{decrypted}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </div>
              <form onSubmit={handleSend} className="flex gap-2 p-3 border-t bg-white sticky bottom-0 z-10">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          ))}
          {/* Group chat */}
          {tab === 'group' && (!selectedGroup ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a group to start chatting.
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="border-b p-3 font-semibold text-lg bg-gray-50">{selectedGroup.name}</div>
              <div
                className="flex-1 overflow-y-auto px-3 py-2"
                style={{ minHeight: 0 }}
                ref={chatMessagesListDivRef}
              >
                {groupMessages.length === 0 ? (
                  <p className="text-gray-500">No messages yet.</p>
                ) : (
                  <ul className="chat-messages-list">
                    {groupMessages.map(msg => {
                      let decrypted = '[Unable to decrypt]';
                      let isMine = Number(msg.sender_id) === Number(myId);
                      try {
                        const mySecretKey = localStorage.getItem('secretKey');
                        // msg.ciphertext is now a JSON mapping user_id -> ciphertext
                        let ciphertextMap = {};
                        if (typeof msg.ciphertext === 'string') {
                          try {
                            ciphertextMap = JSON.parse(msg.ciphertext);
                          } catch {
                            ciphertextMap = {};
                          }
                        } else if (typeof msg.ciphertext === 'object' && msg.ciphertext !== null) {
                          ciphertextMap = msg.ciphertext;
                        }
                        const myCiphertext = ciphertextMap[myId];
                        const senderProfile = users.find(u => u.id === msg.sender_id);
                        const senderPublicKey = senderProfile?.public_key || msg.sender_public_key;
                        if (myCiphertext && senderPublicKey && mySecretKey) {
                          decrypted = encryptionService.decryptMessage(
                            myCiphertext,
                            senderPublicKey,
                            mySecretKey
                          );
                        }
                      } catch (e) {
                        decrypted = '[Unable to decrypt]';
                      }
                      // Avatar/initials
                      let avatar = '';
                      if (isMine) {
                        const myProfile = users.find(u => u.id === myId) || myProfile;
                        if (myProfile?.full_name && myProfile.full_name.trim().length > 0) {
                          avatar = myProfile.full_name.trim()[0].toUpperCase();
                        } else if (myProfile?.email && myProfile.email.trim().length > 0) {
                          avatar = myProfile.email.trim()[0].toUpperCase();
                        } else {
                          avatar = '?';
                        }
                      } else {
                        let senderProfile = users.find(u => u.id === msg.sender_id);
                        let fullName = senderProfile?.full_name || msg.from_user?.full_name || msg.full_name || msg.sender_name || '';
                        let email = senderProfile?.email || msg.from_user?.email || msg.email || msg.sender_email || '';
                        if (fullName && fullName.trim().length > 0) {
                          avatar = fullName.trim()[0].toUpperCase();
                        } else if (email && email.trim().length > 0) {
                          avatar = email.trim()[0].toUpperCase();
                        } else {
                          avatar = '?';
                        }
                      }
                      const rowClass = `chat-message-row ${isMine ? 'sent' : 'received'}`;
                      return (
                        <li key={msg.id} className={rowClass}>
                          <div className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} items-center`}>
                            {!isMine && (
                              <div className="flex items-end mr-2" style={{ color: '#059669', fontWeight: 'bold', fontSize: '1rem' }}>
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  {avatar}
                                </div>
                              </div>
                            )}
                            <span className={`chat-bubble ${isMine ? 'sent-bubble' : 'received-bubble'}`}>{decrypted}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <form onSubmit={handleSendGroup} className="flex gap-2 p-3 border-t bg-white sticky bottom-0 z-10">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
