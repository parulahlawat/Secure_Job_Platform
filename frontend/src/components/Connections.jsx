import React, { useEffect, useState } from "react";
import { default as api, profilesAPI } from "../services/api";

const API = "/api/v1/connections";

export default function Connections({ token, show }) {
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingSenders, setPendingSenders] = useState({});
  const [connectionUsers, setConnectionUsers] = useState({});
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch current user
  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setCurrentUserId(res.data.id))
        .catch(() => setCurrentUserId(null));
    }
  }, [token]);

  // Fetch connections
  useEffect(() => {
    if (token) {
      api
        .get("/connections/my")
        .then(async (res) => {
          setConnections(res.data);
          // Fetch user info for all connected users
          const userIds = res.data.flatMap((c) => [c.sender_id, c.receiver_id]);
          const uniqueUserIds = [...new Set(userIds)];
          const userInfo = {};
          await Promise.all(
            uniqueUserIds.map(async (id) => {
              try {
                const resp = await profilesAPI.getByUser(id);
                userInfo[id] = resp.data;
              } catch {
                userInfo[id] = { full_name: `User ${id}`, email: "" };
              }
            })
          );
          setConnectionUsers(userInfo);
        })
        .catch(() => {
          setConnections([]);
          setConnectionUsers({});
        });
    }
  }, [token, message]);

  // Fetch pending requests received (new endpoint)
  useEffect(() => {
    if (token) {
      api
        .get("/connections/received")
        .then(async (res) => {
          setPending(res.data);
          // Fetch sender info for each pending request
          const senderIds = res.data.map((req) => req.sender_id);
          const uniqueSenderIds = [...new Set(senderIds)];
          const senderInfo = {};
          await Promise.all(
            uniqueSenderIds.map(async (id) => {
              try {
                const resp = await profilesAPI.getByUser(id);
                senderInfo[id] = resp.data;
              } catch {
                senderInfo[id] = { full_name: `User ${id}`, email: "" };
              }
            })
          );
          setPendingSenders(senderInfo);
        })
        .catch(() => {
          setPending([]);
          setPendingSenders({});
        });
    }
  }, [token, message]);

  const respondRequest = (connectionId, accept) => {
    api
      .post(
        "/connections/respond",
        { connection_id: connectionId, accept }
      )
      .then((res) => {
        if (accept) {
          setMessage("Request accepted!");
        } else {
          // Remove declined request from pending list immediately
          setPending((prev) => prev.filter((req) => req.id !== connectionId));
          setMessage("");
        }
      })
      .catch((e) => setMessage(e.response?.data?.detail || "Error"));
  };

  // Sort pending by created_at descending
  const sortedPending = [...pending].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (show === "pending") {
    return (
      <div>
        {sortedPending.length === 0 ? (
          <div>No pending requests.</div>
        ) : (
          <ul>
            {sortedPending.map((req) => {
              const sender = pendingSenders[req.sender_id] || {};
              return (
                <li key={req.id} className="flex items-center justify-between py-2 border-b">
                  <span>
                    <span className="font-semibold">
                      {sender.full_name ? sender.full_name : sender.email ? sender.email : `User ${req.sender_id}`}
                    </span>
                    {sender.email && sender.full_name && (
                      <span className="text-xs text-gray-500 ml-2">({sender.email})</span>
                    )}
                  </span>
                  <span>
                    <button onClick={() => respondRequest(req.id, true)} className="bg-green-500 text-white px-2 py-1 rounded mr-2">Accept</button>
                    <button onClick={() => respondRequest(req.id, false)} className="bg-red-500 text-white px-2 py-1 rounded">Decline</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {message && <div className="mt-2 text-blue-600">{message}</div>}
      </div>
    );
  }

  if (show === "connections") {
    return (
      <div>
        {connections.length === 0 ? (
          <div>No connections yet.</div>
        ) : (
          <ul>
            {connections.map((c) => {
              // Show only the other user's info
              let otherUserId = c.sender_id === currentUserId ? c.receiver_id : c.sender_id;
              const otherUser = connectionUsers[otherUserId] || {};
              return (
                <li key={c.id} className="py-2 border-b">
                  <span className="font-semibold">
                    {otherUser.full_name ? otherUser.full_name : otherUser.email ? otherUser.email : `User ${otherUserId}`}
                  </span>
                  {otherUser.email && otherUser.full_name && (
                    <span className="text-xs text-gray-500 ml-1">({otherUser.email})</span>
                  )}
                  <span className="ml-2 text-xs text-gray-500">({c.status})</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Default: render nothing (legacy section removed)
  return null;
}
