import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Registration stat cards: key = field returned by GET /api/admin/users/stats
const STAT_CARDS = [
  { key: "TODAY", label: "Today", color: "bg-green-600" },
  { key: "YESTERDAY", label: "Yesterday", color: "bg-emerald-600" },
  { key: "7D", label: "Last 7 Days", color: "bg-cyan-600" },
  { key: "15D", label: "Last 15 Days", color: "bg-sky-600" },
  { key: "1M", label: "Last 1 Month", color: "bg-blue-600" },
  { key: "3M", label: "Last 3 Months", color: "bg-indigo-600" },
  { key: "6M", label: "Last 6 Months", color: "bg-purple-600" },
  { key: "1Y", label: "Last 1 Year", color: "bg-pink-600" },
];

export default function Home({
  token,
  mobile,
  gameId,
  onLogout,
  onShowAdminWithdraw,
  onShowAdminWithdrawRequests,
  onShowAdminDepositRequests,
  onShowAdminUserHistory,
}) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef();

  // Registration stats (admin + staff)
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://ludo-server-1.onrender.com";

  // Lifetime Winning state
  const [lifetimeWinning, setLifetimeWinning] = useState(0);

  // ---------------- Profile ----------------
  useEffect(() => {
    if (!token) return;
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch user profile");
        const data = await res.json();
        setUserProfile(data);
        setDisplayName(data.displayName || "");

        const role = data.role?.toLowerCase();
        setIsAdmin(role === "admin");
        setIsStaff(role === "staff");

        // Lifetime Winning from backend (lifetimeEarnings)
        if (typeof data.lifetimeEarnings === "number") {
          setLifetimeWinning(data.lifetimeEarnings);
        }
      } catch (err) {
        console.error("Failed to get user profile:", err);
      }
    };
    fetchUserData();
  }, [token, API_BASE_URL]);

  // ---------------- Balance ----------------
  useEffect(() => {
    if (!token) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.balance != null && !isNaN(data.balance)) {
          setBalance(parseFloat(data.balance));
        } else {
          throw new Error("Invalid balance response");
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance("Error");
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [token, API_BASE_URL]);

  // ---------------- Registration stats (admin + staff) ----------------
  const canViewStats = isAdmin || isStaff;

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    setStatsError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setStatsError("Could not load user stats.");
    } finally {
      setStatsLoading(false);
    }
  }, [token, API_BASE_URL]);

  useEffect(() => {
    if (canViewStats) fetchStats();
  }, [canViewStats, fetchStats]);

  // ---------------- Helpers ----------------
  const renderBalance = () => {
    if (loading) return "Loading...";
    if (balance === "Error") return "Balance unavailable";
    return `৳ ${balance.toFixed(2)}`;
  };

  const formatCount = (value) => {
    if (statsLoading && !stats) return "...";
    if (value === undefined || value === null) return "-";
    return Number(value).toLocaleString();
  };

  const handleSaveProfile = async () => {
    try {
      if (displayName !== userProfile.displayName) {
        const updateRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName }),
        });
        if (!updateRes.ok) throw new Error("Failed to update profile");
      }

      let avatarUrl = userProfile.avatarUrl;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const avatarRes = await fetch(`${API_BASE_URL}/api/user/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!avatarRes.ok) throw new Error("Failed to upload avatar");
        const data = await avatarRes.json();
        avatarUrl = data.avatarUrl;
      }

      setUserProfile((prev) => ({
        ...prev,
        displayName,
        avatarUrl,
      }));

      alert("✅ Profile updated successfully.");
      setEditing(false);
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update profile.");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to remove avatar");

      setUserProfile((prev) => ({
        ...prev,
        avatarUrl: null,
      }));

      alert("🗑️ Avatar removed.");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to remove avatar");
    }
  };

  const renderAvatar = () => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    if (userProfile?.avatarUrl) return `${API_BASE_URL}${userProfile.avatarUrl}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || "U")}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-gray-800 text-white flex justify-between items-center px-6 py-4 shadow-md">
        <div className="text-xl font-semibold">🎮 Ludo Dashboard</div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="bg-cyan-600 px-3 py-1 rounded-full font-bold">{renderBalance()}</span>
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md font-semibold"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="flex justify-center items-start px-4 py-10">
        <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Welcome</h1>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={handleSaveProfile}
                  className="text-sm text-green-600 font-semibold"
                >
                  ✅ Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setAvatarFile(null);
                    setDisplayName(userProfile.displayName || "");
                  }}
                  className="text-sm text-gray-500"
                >
                  ❌ Cancel
                </button>
              </div>
            )}
          </div>

          {userProfile && (
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div>
                <img
                  src={renderAvatar()}
                  alt="avatar"
                  className="w-28 h-28 object-cover rounded-full border"
                />
                {editing && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files[0])}
                      className="text-sm"
                      ref={fileInputRef}
                    />
                    {userProfile.avatarUrl && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="text-red-600 text-xs"
                      >
                        🗑️ Remove Avatar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-gray-800 w-full">
                <div>
                  <strong>👤 Name:</strong>{" "}
                  {editing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="border px-2 py-1 rounded w-full max-w-sm"
                    />
                  ) : (
                    userProfile.displayName || "Not set"
                  )}
                </div>
                <div>
                  <strong>📱 Mobile:</strong> {userProfile.mobile}
                </div>
                <div>
                  <strong>🎮 Game ID:</strong> {userProfile.gameId}
                </div>

                {/* Lifetime Winning */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="font-semibold text-yellow-600">
                    🪙 Lifetime Winning: ৳ {lifetimeWinning}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= User registration stats (Admin + Staff) ================= */}
          {canViewStats && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">👥 User Registrations</h2>
                <button
                  onClick={fetchStats}
                  disabled={statsLoading}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {statsLoading ? "Refreshing..." : "🔄 Refresh"}
                </button>
              </div>

              {/* Total users */}
              <div className="bg-gray-800 text-white rounded-lg shadow-md px-5 py-4 flex items-center justify-between">
                <span className="font-semibold">Total Users</span>
                <span className="text-3xl font-bold">{formatCount(stats?.total)}</span>
              </div>

              {statsError && <div className="text-sm text-red-600">{statsError}</div>}

              {/* Period cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className={`${card.color} text-white rounded-lg shadow-md px-4 py-3 text-center`}
                  >
                    <div className="text-2xl font-bold">{formatCount(stats?.[card.key])}</div>
                    <div className="text-xs mt-1 opacity-90">{card.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ================= Admin buttons (Admin only) ================= */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <ActionButton
                text="📥 Admin Deposit Requests"
                onClick={onShowAdminDepositRequests}
                className="bg-purple-600"
              />
              <ActionButton
                text="📤 Admin Withdraw Requests"
                onClick={onShowAdminWithdrawRequests || onShowAdminWithdraw}
                className="bg-blue-600"
              />
              <ActionButton
                text="🧾 All User History"
                onClick={onShowAdminUserHistory}
                className="bg-gray-700"
              />
              <ActionButton
                text="⚙️ Admin Payment Number"
                onClick={() => navigate("/payment-number")}
                className="bg-orange-600"
              />
              <ActionButton
                text="📲 App Update Upload"
                onClick={() => navigate("/admin-app")}
                className="bg-teal-600"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ActionButton({ text, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`text-white font-semibold py-3 rounded-md shadow-md hover:opacity-90 transition ${className}`}
    >
      {text}
    </button>
  );
              }
