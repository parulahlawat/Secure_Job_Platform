import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function UserSearch({ token, onUserSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef();
  const navigate = useNavigate();

  // Debounced live search
  const fetchSuggestions = async (q) => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/profiles/search`, {
        params: { q },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    fetchSuggestions(query);
  };

  const handleSelect = (u) => {
    setShowSuggestions(false);
    setQuery(u.full_name || u.email || "");
    if (onUserSelect) {
      onUserSelect(u);
    } else {
      navigate(`/user/${u.id}`);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search people by name or email..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className="border px-3 py-2 rounded w-full"
          autoComplete="off"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {showSuggestions && query && (
        <div className="absolute z-10 bg-white border rounded w-full shadow max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-gray-500">Loading...</div>
          ) : results.length > 0 ? (
            <ul className="divide-y">
              {results.map((u) => (
                <li
                  key={u.id}
                  className="py-2 cursor-pointer hover:bg-blue-50 px-2 rounded"
                  onClick={() => handleSelect(u)}
                >
                  <span className="font-semibold">{u.full_name}</span>
                  {u.email && (
                    <span className="text-xs text-gray-500 ml-2">{u.email}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-2 text-gray-500">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}
