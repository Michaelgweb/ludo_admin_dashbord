import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Home({
  token,
  mobile,
  gameId,
  onLogout,
  onShowDeposit,
  onShowWithdraw,
  onShowAdminWithdraw,
  onShowAdminDepositRequests,
  onShowHistory,
  onShowAdminUserHistory,
  onShowLudoMatch,
}) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://ludo-server-1.onrender.com";

  // Lifetime Winning state
  const [lifetimeWinning, setLifetimeWinning] = useState(0);

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
        setIsAdmin(data.role?.toLowerCase() === "admin");

        // ✅ Lifetime Winning from backend (lifetimeEarnings)
        if (typeof data.lifetimeEarnings === "number") {
          setLifetimeWinning(data.lifetimeEarnings);
        }
      } catch (err) {
        console.error("Failed to get user profile:", err);
      }
    };
    fetchUserData();
  }, [token, API_BASE_URL]);

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

  const renderBalance = () => {
    if (loading) return "Loading...";
    if (balance === "Error") return "Balance unavailable";
    return `৳ ${balance.toFixed(2)}`;
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

                {/* ✅ Lifetime Winning */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="font-semibold text-yellow-600">
                    🪙 Lifetime Winning: ৳ {lifetimeWinning}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <ActionButton text="💰 Deposit" onClick={onShowDeposit} className="bg-green-600" />
            <ActionButton text="💸 Withdraw" onClick={onShowWithdraw} className="bg-red-500" />
            <ActionButton text="📂 My Transaction History" onClick={onShowHistory} className="bg-cyan-600" />
            <ActionButton text="🎲 Play Ludo" onClick={onShowLudoMatch} className="bg-yellow-500" />

            {/* ✅ New Referral History Button */}
            <ActionButton text="📋 Referral History" onClick={() => navigate("/referrals")} className="bg-indigo-600" />

            {isAdmin && (
              <>
                <ActionButton
                  text="📥 Admin Deposit Requests"
                  onClick={onShowAdminDepositRequests}
                  className="bg-purple-600"
                />
                <ActionButton
                  text="📤 Admin Withdraw Requests"
                  onClick={onShowAdminWithdraw}
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
              </>
            )}
          </div>
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
