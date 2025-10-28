import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginForm({ onLogin, onRegisterClick }) {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL?.trim() || "https://ludo-server-1.onrender.com";

  // Normalize mobile to 880XXXXXXXXXX format
  const normalizeMobile = (number) => {
    const trimmed = number.trim();
    return trimmed.startsWith("880") ? trimmed : "880" + trimmed.replace(/^0+/, "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedMobile = normalizeMobile(mobile);

    try {
      // Login request
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile, password }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Login failed. Check your credentials.");
      }

      const data = await res.json();

      // Save token & basic user info
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("gameId", data.user?.gameId || "");
      localStorage.setItem("userMobile", data.user?.mobile || "");
      localStorage.setItem("userName", data.user?.displayName || "");
      localStorage.setItem("userRole", data.user?.role || "");
      localStorage.setItem("avatarUrl", data.user?.avatarUrl || "");

      // Optional: Fetch latest profile info
      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          localStorage.setItem("userName", profileData.displayName || "");
          localStorage.setItem("avatarUrl", profileData.avatarUrl || "");
        }
      } catch (profileErr) {
        console.warn("Profile fetch failed:", profileErr);
      }

      onLogin(data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome Back
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">
          Please login to continue
        </p>

        <input
          type="tel"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
          className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 mb-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="text-right text-sm mb-4">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 hover:underline"
          >
            Forgot your password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold ${
            loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p className="text-red-500 text-center mt-4 text-sm font-medium">{error}</p>
        )}

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don't have an account?{" "}
          <span
            className="text-blue-600 hover:underline cursor-pointer font-semibold"
            onClick={onRegisterClick}
          >
            Register now
          </span>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
