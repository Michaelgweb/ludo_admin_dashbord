import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const ForgotPassword = () => {
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const normalizeMobile = (number) => {
    if (number.startsWith("880")) return number;
    return "880" + number.replace(/^0+/, "");
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizeMobile(mobile) }),
      });

      if (!res.ok) throw new Error("Failed to send OTP");

      setOtpSent(true);
      setMessage("✅ OTP has been sent successfully.");
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setMessage("");

    const normalizedMobile = normalizeMobile(mobile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/otp/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: normalizedMobile,
          otp,
          newPassword,
        }),
      });

      if (!res.ok) throw new Error("Password reset failed");

      // ✅ Try to log in automatically
      const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: normalizedMobile,
          password: newPassword,
        }),
      });

      if (!loginRes.ok) throw new Error("Password changed but login failed");

      const data = await loginRes.json();

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("gameId", data.user.gameId || "");
      localStorage.setItem("userMobile", data.user.mobile || "");
      localStorage.setItem("userName", data.user.displayName || "");
      localStorage.setItem("userRole", data.user.role || "");
      localStorage.setItem("avatarUrl", data.user.avatarUrl || "");

      setMessage("✅ Password reset and login successful! Redirecting...");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center text-indigo-600">
          Forgot Password
        </h2>

        <input
          type="tel"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {!otpSent ? (
          <button
            onClick={handleSendOtp}
            disabled={loading || !mobile}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <button
              onClick={handleResetPassword}
              disabled={loading || !otp || !newPassword}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </>
        )}

        {message && (
          <div
            className={`mt-4 text-center text-sm ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
