import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://ludo.adcpa.live";

function RegisterForm({ onRegisterSuccess, goToLogin }) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(""); // New referral code state
  const [stage, setStage] = useState("send"); // send or verify
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("✅ OTP sent to your mobile");
      setStage("verify");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = { mobile, otp, password };
      if (referralCode && referralCode.trim() !== "") {
        payload.referralCode = referralCode.trim();
      }

      const res = await fetch(`${API_BASE_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("✅ Registration successful!");
      onRegisterSuccess();
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Create Account
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">
          Register with your mobile number
        </p>

        <input
          type="tel"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
          className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {stage === "verify" && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Set Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Referral Code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}

        <button
          onClick={stage === "send" ? sendOtp : verifyOtpAndRegister}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading
            ? "Processing..."
            : stage === "send"
            ? "Send OTP"
            : "Verify & Register"}
        </button>

        {error && (
          <p className="text-red-500 text-center mt-4 text-sm font-medium">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-600 hover:underline cursor-pointer font-semibold"
            onClick={goToLogin}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
