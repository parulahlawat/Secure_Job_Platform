import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminLoginLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/v1/auth/admin/login-logs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(res.data);
      } catch (e) {
        setError(e.response?.data?.detail || "Failed to fetch logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">User & Recruiter Login/Logout Logs</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-2 py-1 border">User</th>
              <th className="px-2 py-1 border">Email</th>
              <th className="px-2 py-1 border">Role</th>
              <th className="px-2 py-1 border">Action</th>
              <th className="px-2 py-1 border">Details</th>
              <th className="px-2 py-1 border">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-2 py-1 border">{log.full_name}</td>
                <td className="px-2 py-1 border">{log.email}</td>
                <td className="px-2 py-1 border">{log.role}</td>
                <td className="px-2 py-1 border">{log.action}</td>
                <td className="px-2 py-1 border text-xs">{log.details}</td>
                <td className="px-2 py-1 border text-xs">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
