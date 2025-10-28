import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function WithdrawForm({ onCancel }) {
  const [method, setMethod] = useState("bKash");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  const API_BASE = process.env.REACT_APP_API_BASE_URL; // ✅ .env থেকে
  const MIN_WITHDRAW_AMOUNT = 30;

  // Load balance
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetch(`${API_BASE}/api/user/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data) setBalance(data.balance);
      })
      .catch(() => {
        setMessage("❌ Could not load balance.");
      });
  }, [token, navigate, API_BASE]);

  // Cooldown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} minute${m !== 1 ? "s" : ""} ${s} second${s !== 1 ? "s" : ""}`;
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;

    if (val !== "" && parseFloat(val) < MIN_WITHDRAW_AMOUNT) {
      setMessage(`❌ Minimum withdrawal amount is ৳${MIN_WITHDRAW_AMOUNT}.`);
    } else if (balance !== null && parseFloat(val) > balance) {
      setMessage(`❌ Insufficient balance. Your balance is ৳${balance.toFixed(2)}`);
    } else {
      setMessage("");
    }

    setAmount(val);
  };

  const handleSendOtp = async () => {
    if (!token) return;

    if (!amount || parseFloat(amount) < MIN_WITHDRAW_AMOUNT) {
      setMessage(`❌ Minimum withdrawal amount is ৳${MIN_WITHDRAW_AMOUNT}.`);
      return;
    }
    if (balance !== null && parseFloat(amount) > balance) {
      setMessage(`❌ Insufficient balance. Your balance is ৳${balance.toFixed(2)}`);
      return;
    }
    if (!receiverNumber) {
      setMessage("❌ Please fill all fields first.");
      return;
    }
    if (cooldown > 0) {
      setMessage(`⏳ Wait next request: ${formatTime(cooldown)}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/withdraw/send-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setOtpSent(true);
        setMessage("✅ OTP sent to your registered mobile number.");
      } else {
        if (data.remainingSeconds) {
          setCooldown(data.remainingSeconds);
        } else if (data.error) {
          setMessage("❌ " + data.error);
        } else {
          setMessage("❌ Failed to send OTP");
        }
      }
    } catch (err) {
      setMessage("❌ Network error: " + err.message);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();

    if (!otpSent) {
      setMessage("❌ Please request OTP first.");
      return;
    }
    if (!otp) {
      setMessage("❌ Please enter OTP.");
      return;
    }
    if (!amount || parseFloat(amount) < MIN_WITHDRAW_AMOUNT) {
      setMessage(`❌ Minimum withdrawal amount is ৳${MIN_WITHDRAW_AMOUNT}.`);
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      method,
      receiverNumber,
      amount: parseFloat(amount),
      otp,
    };

    try {
      const res = await fetch(`${API_BASE}/api/withdraw/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("✅ Withdraw request sent successfully!");
        setReceiverNumber("");
        setAmount("");
        setOtp("");
        setOtpSent(false);
        setWithdrawSuccess(true);

        const updatedBalanceRes = await fetch(`${API_BASE}/api/user/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (updatedBalanceRes.ok) {
          const updatedData = await updatedBalanceRes.json();
          setBalance(updatedData.balance);
        }
      } else {
        const errorText = await res.text();
        setMessage("❌ Failed to withdraw: " + errorText);
      }
    } catch (err) {
      setMessage("❌ Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleWithdraw}
        className="bg-white shadow-md rounded-xl w-full max-w-md p-6 space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800">
          🧾 Withdraw Request
        </h2>

        <div className="text-sm text-gray-700 text-center">
          Your balance:{" "}
          <span className="font-semibold text-indigo-600">
            {balance !== null ? `৳ ${balance.toFixed(2)}` : "Loading..."}
          </span>
        </div>

        {cooldown > 0 && (
          <div className="text-center text-yellow-700 font-medium">
            ⏳ Please wait: {formatTime(cooldown)}
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            disabled={withdrawSuccess}
          >
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Receiver Number
          </label>
          <input
            type="text"
            value={receiverNumber}
            onChange={(e) => setReceiverNumber(e.target.value)}
            required
            placeholder="e.g. 017XXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            disabled={withdrawSuccess}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={handleAmountChange}
            required
            placeholder="0.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            disabled={withdrawSuccess}
          />
        </div>

        {otpSent && !withdrawSuccess && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}

        {message && (
          <div
            className={`text-sm text-center font-semibold p-3 rounded ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : message.startsWith("⏳")
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex gap-4 pt-2">
          {!withdrawSuccess && !otpSent && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={cooldown > 0}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-md transition"
            >
              📲 Send OTP
            </button>
          )}

          {!withdrawSuccess && otpSent && (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md transition"
            >
              {loading ? "Sending..." : "Submit Request"}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 rounded-md transition"
          >
            ⬅️ Back
          </button>
        </div>
      </form>
    </div>
  );
}
