import React, { useEffect, useState, useCallback, useRef } from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://ludo-server-1.onrender.com";

// Date range filters: value = "range" query param of GET /api/admin/users
const RANGES = [
  { value: "ALL", label: "All" },
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "7D", label: "7 Days" },
  { value: "15D", label: "15 Days" },
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "6M", label: "6 Months" },
  { value: "1Y", label: "1 Year" },
];

const PAGE_SIZE = 20;

// createdAt / lastLoginTime are Bangladesh local time without a zone ("2026-10-21T14:30:00")
function formatLocal(value) {
  if (!value) return "-";
  if (Array.isArray(value)) {
    const [y, mo, d, h = 0, mi = 0] = value;
    const p = (n) => String(n).padStart(2, "0");
    return `${y}-${p(mo)}-${p(d)} ${p(h)}:${p(mi)}`;
  }
  return String(value).replace("T", " ").slice(0, 19);
}

// Login history times are Instants (UTC), so show them in Bangladesh time
function formatInstant(value) {
  if (!value) return "-";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
}

export default function AdminUserHistory({ token: tokenProp, onCancel }) {
  // App.jsx may not pass the token, so fall back to localStorage
  const token = tokenProp || localStorage.getItem("authToken");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [range, setRange] = useState("ALL");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced search value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Login history modal
  const [loginUser, setLoginUser] = useState(null);
  const [logins, setLogins] = useState([]);
  const [loginsLoading, setLoginsLoading] = useState(false);
  const [loginsError, setLoginsError] = useState("");

  const debounceRef = useRef(null);

  // Debounce the search box (wait 400ms after typing stops)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      setQuery(search.trim());
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query,
        range,
        page: String(page),
        size: String(PAGE_SIZE),
      });
      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) throw new Error("You do not have permission to view users.");
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 0);
      setTotalItems(data.totalItems || 0);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load users.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, query, range, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const changeRange = (value) => {
    setRange(value);
    setPage(0);
    setExpandedId(null);
  };

  const openLogins = async (user) => {
    setLoginUser(user);
    setLogins([]);
    setLoginsError("");
    setLoginsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${encodeURIComponent(user.gameId)}/logins?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load login history (${res.status})`);
      setLogins(await res.json());
    } catch (err) {
      console.error(err);
      setLoginsError(err.message || "Failed to load login history.");
    } finally {
      setLoginsLoading(false);
    }
  };

  const closeLogins = () => {
    setLoginUser(null);
    setLogins([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-gray-800 text-white flex justify-between items-center px-6 py-4 shadow-md">
        <div className="text-xl font-semibold">🧾 All Users</div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-md text-sm font-semibold"
          >
            ← Back
          </button>
        )}
      </header>

      <main className="px-4 py-6 max-w-7xl mx-auto space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mobile, game ID or IP address"
            className="border rounded px-3 py-2 w-full"
          />
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => changeRange(r.value)}
                className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  range === r.value
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            {loading ? "Loading..." : `${totalItems.toLocaleString()} user(s) found`}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 rounded px-4 py-3 text-sm">{error}</div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Registered</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Game ID</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Signup IP</th>
                <th className="px-3 py-2">Last Login IP</th>
                <th className="px-3 py-2">Device</th>
                <th className="px-3 py-2">OS</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}

              {items.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className="border-t hover:bg-gray-50 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{formatLocal(u.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{u.mobile}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.gameId}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      ৳ {Number(u.balance ?? 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.ipAddress || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.lastLoginIp || "-"}</td>
                    <td className="px-3 py-2">
                      {[u.deviceName, u.deviceModel].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {[u.osName, u.osVersion].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {[u.city, u.country].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {u.blocked ? (
                        <span className="text-red-600 font-semibold">Blocked</span>
                      ) : (
                        <span className={u.status === "ONLINE" ? "text-green-600" : "text-gray-500"}>
                          {u.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap space-x-3">
                      <button
                        onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                        className="text-blue-600 hover:underline"
                      >
                        {expandedId === u.id ? "Hide" : "Details"}
                      </button>
                      <button
                        onClick={() => openLogins(u)}
                        className="text-indigo-600 hover:underline"
                      >
                        Logins
                      </button>
                    </td>
                  </tr>

                  {expandedId === u.id && (
                    <tr className="bg-gray-50 border-t">
                      <td colSpan={12} className="px-4 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-gray-700">
                          <Detail label="Name" value={u.displayName} />
                          <Detail label="Referred by" value={u.referredBy} />
                          <Detail label="Last login" value={formatLocal(u.lastLoginTime)} />
                          <Detail label="Login count" value={u.loginCount} />
                          <Detail label="Total devices" value={u.totalDevices} />
                          <Detail label="Device ID" value={u.deviceId} />
                          <Detail label="Browser" value={u.browser} />
                          <Detail label="Turnover balance" value={u.turnoverBalance} />
                          <Detail label="Lifetime earnings" value={u.lifetimeEarnings} />
                          <Detail label="Lifetime withdraw" value={u.lifetimeWithdraw} />
                          <div className="sm:col-span-2 lg:col-span-3 break-all">
                            <span className="font-semibold">User agent: </span>
                            {u.userAgent || "-"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-40"
            >
              ← Prev
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages || loading}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Login history modal */}
      {loginUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeLogins}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="font-bold text-gray-800">
                Login history: {loginUser.mobile} ({loginUser.gameId})
              </div>
              <button onClick={closeLogins} className="text-gray-500 hover:text-gray-800 text-xl">
                ✕
              </button>
            </div>

            <div className="overflow-auto p-4">
              {loginsLoading && <div className="text-gray-500">Loading...</div>}
              {loginsError && <div className="text-red-600 text-sm">{loginsError}</div>}
              {!loginsLoading && !loginsError && logins.length === 0 && (
                <div className="text-gray-500">No login records yet.</div>
              )}

              {logins.length > 0 && (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Logged in</th>
                      <th className="px-3 py-2">IP</th>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">OS</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logins.map((l, i) => (
                      <tr key={l.id ?? i} className="border-t align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{formatInstant(l.loggedInAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.ipAddress || "-"}</td>
                        <td className="px-3 py-2">
                          {[l.deviceName, l.deviceModel].filter(Boolean).join(" ") || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {[l.osName, l.osVersion].filter(Boolean).join(" ") || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {[l.city, l.country].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {l.active ? (
                            <span className="text-green-600 font-semibold">Active</span>
                          ) : (
                            <span className="text-gray-500">
                              Ended{l.logoutReason ? ` (${l.logoutReason})` : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      {value === undefined || value === null || value === "" ? "-" : String(value)}
    </div>
  );
}
