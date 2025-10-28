import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export default function PaymentNumber() {
  const [bkash, setBkash] = useState("");
  const [nagad, setNagad] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [gameId, setGameId] = useState("");

  const authToken = localStorage.getItem("authToken");
  const navigate = useNavigate();

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const profileRes = await axios.get(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const userRole = profileRes.data.role || "";
        setRole(userRole);

        if (userRole.toUpperCase() === "ADMIN") {
          setGameId(profileRes.data.gameId || "");
        }

        const paymentRes = await axios.get(`${API_BASE_URL}/api/payment-config`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const bkashConfig = paymentRes.data.find(
          (c) => c.method?.toLowerCase() === "bkash"
        );
        const nagadConfig = paymentRes.data.find(
          (c) => c.method?.toLowerCase() === "nagad"
        );

        if (bkashConfig) setBkash(bkashConfig.number);
        if (nagadConfig) setNagad(nagadConfig.number);
      } catch (err) {
        alert("❌ Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken]);

  const saveNumber = async (method, number) => {
    if (!number.trim()) {
      alert("❌ Please enter a number");
      return;
    }

    if (!gameId.trim()) {
      alert("❌ Please enter a Game ID");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/payment-config/update-by-gameid`,
        null,
        {
          params: { gameId, method, number },
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      alert(`✅ ${method} number updated successfully for Game ID: ${gameId}`);
    } catch (err) {
      if (err.response?.status === 403) {
        alert("❌ Permission denied (Admin only)");
      } else {
        alert("❌ Update failed");
      }
    }
  };

  const renderField = (label, colorClass, value, setValue, method) => (
    <div className="bg-white p-5 rounded-xl shadow-md border mb-6">
      <h3 className={`mb-3 font-semibold text-lg ${colorClass}`}>{label}</h3>
      <input
        type="text"
        value={value}
        placeholder={`Enter ${label}`}
        onChange={(e) => setValue(e.target.value)}
        disabled={role.toUpperCase() !== "ADMIN"}
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
      />
      {role.toUpperCase() === "ADMIN" && (
        <button
          onClick={() => saveNumber(method, value)}
          className="mt-3 px-4 py-2 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition"
        >
          Save {label}
        </button>
      )}
    </div>
  );

  if (loading) return <div className="text-center p-6">⏳ Loading...</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-center mb-6">
        💳 Payment Number Settings
      </h2>

      <div className="bg-white p-5 rounded-xl shadow-md border mb-6">
        <h3 className="mb-3 font-semibold text-lg text-gray-700">Game ID</h3>
        <input
          type="text"
          value={gameId}
          placeholder="Enter Game ID"
          onChange={(e) => setGameId(e.target.value)}
          disabled={role.toUpperCase() === "ADMIN"}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
        />
      </div>

      {renderField("bKash Number", "text-pink-600", bkash, setBkash, "bKash")}
      {renderField("Nagad Number", "text-orange-600", nagad, setNagad, "Nagad")}
    </div>
  );
}
