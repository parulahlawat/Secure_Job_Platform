// Utility to fetch admin movement logs from backend
import axios from "axios";

export async function fetchAdminMovements() {
  // You may want to secure this endpoint in production
  const res = await axios.get("/api/admin/movements");
  return res.data;
}
