import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { messagesAPI, profilesAPI } from '../services/api';
import { encryptionService } from '../services/encryption';
import toast from 'react-hot-toast';

export default function ChatWithUser() {
  const [selectedUser, setSelectedUser] = useState(null);
  // Debug state for showing keys
  const [myProfile, setMyProfile] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Fix: Add missing handleResetKeys function
  const handleResetKeys = async () => {
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

      useEffect(() => {
        // Fetch own profile for backend public key
        profilesAPI.getMe().then(res => setMyProfile(res.data)).catch(() => setMyProfile(null));
      }, []);
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipientPublicKey, setRecipientPublicKey] = useState(null);
  const messagesEndRef = useRef(null);

  // Get sender's secret key from localStorage (assume it's stored as 'secretKey')
  const senderSecretKey = localStorage.getItem('secretKey');
  console.log('[DEBUG] senderSecretKey:', senderSecretKey);

  useEffect(() => {
    const fetchMessagesAndRecipient = async () => {
      try {
        const [msgRes, userRes] = await Promise.all([
          messagesAPI.getWith(id),
          profilesAPI.getAll()
        ]);
        setMessages(msgRes.data || []);
        // Find recipient's user object from user list
        const recipient = userRes.data.find(u => String(u.id) === String(id));
        setSelectedUser(recipient || null);
        if (!recipient) {
          console.error('[DEBUG] No recipient found for id:', id, 'in userRes.data:', userRes.data);
        } else if (!recipient.public_key) {
          console.error('[DEBUG] Recipient found but missing public_key:', recipient);
        }
        if (recipient && recipient.public_key) {
          setRecipientPublicKey(recipient.public_key);
        } else {
          setError('Recipient public key not found');
        }
      } catch (err) {
        setError('Failed to load messages or recipient');
        toast.error('Failed to load messages or recipient');
      } finally {
        setLoading(false);
      }
    };
    fetchMessagesAndRecipient();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !senderSecretKey) {
      toast.error('Missing encryption keys or message');
      return;
    }
    try {
      // Always fetch the latest recipient profile before sending
      const recipientProfileRes = await profilesAPI.get(id);
      const latestRecipientPublicKey = recipientProfileRes.data.public_key;
      if (!latestRecipientPublicKey) {
        toast.error('Recipient public key not found. Cannot send message securely.');
        return;
      }
      const ciphertext = encryptionService.encryptMessage(input, latestRecipientPublicKey, senderSecretKey);
      const res = await messagesAPI.send({ recipient_id: parseInt(id), ciphertext });
      setMessages((prev) => [...prev, res.data]);
      setInput('');
      // Update cached recipient public key in state
      setRecipientPublicKey(latestRecipientPublicKey);
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Debug UI removed */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleResetKeys}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
        >
          Reset Encryption Keys
        </button>
      </div>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/messages')}
            className="text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-2 transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Chat</h1>
        </div>
      </nav>
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col bg-white rounded-lg shadow mt-8 min-h-[400px]">
        {loading ? (
          <p>Loading messages...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: 400 }}>
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet.</p>
            ) : (
              <ul className="chat-messages-list">
                {messages.map((msg) => {
                  let decrypted = '[Unable to decrypt]';
                  let isMine = false;
                  try {
                    const myUserId = parseInt(localStorage.getItem('user_id'));
                    const mySecretKey = localStorage.getItem('secretKey');
                    isMine = msg.from_user_id === myUserId;
                    if (isMine) {
                      decrypted = encryptionService.decryptMessage(
                        msg.ciphertext,
                        recipientPublicKey,
                        mySecretKey
                      );
                    } else {
                      const sender = msg.from_user_public_key || (msg.from_user && msg.from_user.public_key);
                      if (sender && mySecretKey) {
                        decrypted = encryptionService.decryptMessage(
                          msg.ciphertext,
                          sender,
                          mySecretKey
                        );
                      }
                    }
                  } catch (e) {
                    decrypted = '[Unable to decrypt]';
                  }
                  // Avatar/initials
                  const avatar = isMine
                    ? (myProfile?.full_name?.[0] || myProfile?.email?.[0] || 'Y')
                    : (selectedUser?.full_name?.[0] || selectedUser?.email?.[0] || 'U');
                  return (
                    <li key={msg.id} className={`chat-message-row ${isMine ? 'sent' : 'received'}`}> 
                      {!isMine && (
                        <div className="flex items-end mr-2">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm">
                            {avatar}
                          </div>
                        </div>
                      )}
                      <span className={`chat-bubble ${isMine ? 'sent-bubble' : 'received-bubble'}`}>{decrypted}</span>
                      {isMine && (
                        <div className="flex items-end ml-2">
                          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
                            {avatar}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                <div ref={messagesEndRef} />
              </ul>
            )}
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2 mt-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
    </div>
  );
}
