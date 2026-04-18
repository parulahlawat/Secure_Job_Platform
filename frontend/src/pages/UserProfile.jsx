import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function UserProfile({ token }) {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    if (id && token) {
      axios
        .get(`/api/v1/profiles/by_user/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setProfile(res.data))
        .catch(() => setProfile(null));
      // Optionally, fetch connection status
      axios
        .get(`/api/v1/connections/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const found = res.data.find(
            (c) => (c.sender_id === Number(id) || c.receiver_id === Number(id)) && c.status === "accepted"
          );
          setConnectionStatus(found ? found.status : null);
        })
        .catch(() => setConnectionStatus(null));
    }
  }, [id, token]);

  const sendRequest = () => {
    axios
      .post(
        `/api/v1/connections/request`,
        { receiver_id: Number(id) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => setMessage("Request sent!"))
      .catch((e) => setMessage(e.response?.data?.detail || "Error"));
  };

  if (!profile) return <div>User not found.</div>;

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow mt-8">
      <h2 className="text-2xl font-bold mb-2">{profile.full_name || profile.email}</h2>
      <p className="text-gray-600 mb-2">{profile.bio}</p>
      <p className="text-gray-600 mb-2">Location: {profile.location}</p>
      <p className="text-gray-600 mb-2">Skills: {profile.skills}</p>
      <p className="text-gray-600 mb-2">Experience: {profile.experience_years} years</p>
      <p className="text-gray-600 mb-2">Website: {profile.website}</p>
      {connectionStatus === "accepted" ? (
        <div className="text-green-600 font-semibold">Connected</div>
      ) : (
        <button onClick={sendRequest} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
          Send Connection Request
        </button>
      )}
      {message && <div className="mt-2 text-blue-600">{message}</div>}
    </div>
  );
}
