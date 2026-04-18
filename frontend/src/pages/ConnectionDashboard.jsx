
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import UserSearch from "../components/UserSearch";
import Connections from "../components/Connections";
import { useAuthStore } from "../store";

const ConnectionDashboard = () => {
  const token = useAuthStore((state) => state.token);
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestStatus, setRequestStatus] = useState("");
  const [sending, setSending] = useState(false);

  // Check if already connected or request sent
  const [profileError, setProfileError] = useState("");
  useEffect(() => {
    if (selectedUser && token) {
      setRequestStatus("");
      setSending(false);
      setProfileError("");
      api
        .get("/connections/my")
        .then((res) => {
          const found = res.data.find(
            (c) =>
              (c.sender_id === selectedUser.id || c.receiver_id === selectedUser.id) &&
              ["pending", "accepted"].includes(c.status)
          );
          if (found) {
            setRequestStatus(found.status === "accepted" ? "Connected" : "Request Sent");
          }
        })
        .catch(() => setRequestStatus(""));
    }
  }, [selectedUser, token]);

  const handleSendRequest = () => {
    if (!selectedUser) return;
    setSending(true);
    api
      .post("/connections/request", { receiver_id: selectedUser.id })
      .then(() => {
        setRequestStatus("Request Sent");
      })
      .catch((e) => {
        setRequestStatus(e.response?.data?.detail || "Error");
      })
      .finally(() => setSending(false));
  };
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Connections</h1>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col gap-4">
        {/* Search bar and user info */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <UserSearch token={token} onUserSelect={setSelectedUser} />
          </div>
          {selectedUser && (
            <div className="flex-1 bg-gray-50 p-4 rounded shadow">
              {profileError ? (
                <div className="text-red-600 font-semibold">{profileError}</div>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-2">{selectedUser.full_name || selectedUser.email}</h2>
                  <p className="text-gray-600 mb-1">Email: {selectedUser.email}</p>
                  <p className="text-gray-600 mb-1">Location: {selectedUser.location}</p>
                  <p className="text-gray-600 mb-1">Skills: {selectedUser.skills}</p>
                  <p className="text-gray-600 mb-1">Experience: {selectedUser.experience_years} years</p>
                  <p className="text-gray-600 mb-1">Website: {selectedUser.website}</p>
                  {requestStatus === "Connected" ? (
                    <div className="text-green-600 font-semibold mt-2">Connected</div>
                  ) : requestStatus === "Request Sent" ? (
                    <div className="text-blue-600 font-semibold mt-2">Request Sent</div>
                  ) : (
                    <button
                      onClick={handleSendRequest}
                      className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
                      disabled={sending}
                    >
                      {sending ? "Sending..." : "Send Connection Request"}
                    </button>
                  )}
                  {requestStatus && !["Connected", "Request Sent"].includes(requestStatus) && (
                    <div className="mt-2 text-red-600">{requestStatus}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {/* Connections and Pending Requests */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/3 order-2 md:order-1">
            {/* Pending Requests (left) */}
            <div className="bg-gray-100 p-4 rounded shadow">
              <h3 className="font-bold mb-2">Pending Requests</h3>
              {/* TODO: Integrate pending requests list here, sorted by time, with accept/reject */}
              <Connections token={token} show="pending" />
            </div>
          </div>
          <div className="md:w-2/3 order-1 md:order-2">
            {/* Connections (right) */}
            <div className="bg-gray-100 p-4 rounded shadow">
              <h3 className="font-bold mb-2">My Connections</h3>
              {/* TODO: Integrate connections list here */}
              <Connections token={token} show="connections" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDashboard;
