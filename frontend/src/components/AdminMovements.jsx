import React, { useEffect, useState } from "react";
import { fetchAdminMovements } from "../services/movements";

export default function AdminMovements() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminMovements()
      .then(setLogs)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading admin movements...</div>;
  if (error) return <div>Error loading movements: {String(error)}</div>;

  return (
    <div>
      <h2>Admin Movements Log</h2>
      <ul style={{ maxHeight: 400, overflow: "auto", background: "#f8f8f8", padding: 16, borderRadius: 8 }}>
        {logs.length === 0 && <li>No movements found.</li>}
        {logs.map((log, idx) => (
          <li key={idx} style={{ marginBottom: 12, borderBottom: "1px solid #ddd", paddingBottom: 8 }}>
            <strong>{log.action}</strong> by <em>{log.actor}</em> <br />
            <span style={{ color: "#888" }}>{log.timestamp}</span>
            <pre style={{ background: "#fff", padding: 8, borderRadius: 4, marginTop: 4 }}>{JSON.stringify(log.details, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
