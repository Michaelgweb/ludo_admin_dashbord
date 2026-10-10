import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const METHODS = [
  { key: "BKASH", label: "bKash", color: "text-pink-600" },
  { key: "NAGAD", label: "Nagad", color: "text-orange-600" },
  { key: "ROCKET", label: "Rocket", color: "text-purple-600" },
  { key: "UPAY", label: "Upay", color: "text-green-600" },
];

export default function PaymentNumber() {
  const [role, setRole] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [method, setMethod] = useState("BKASH");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authToken = localStorage.getItem("authToken");
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${authToken}` };
  const isAdmin = role.toUpperCase() === "ADMIN";

  const errMsg = (err, fallback) => {
    if (err.response?.status === 403) return "Permission denied (Admin only)";
    return err.response?.data?.message || fallback;
  };

  const loadAccounts = useCallback(async () => {
    const res = await axios.get(`${API_BASE_URL}/api/admin/payment-accounts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAccounts(res.data);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const profile = await axios.get(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const r = profile.data.role || "";
        setRole(r);
        if (r.toUpperCase() === "ADMIN") await loadAccounts();
      } catch (err) {
        alert("❌ " + errMsg(err, "Failed to load data"));
      } finally {
        setLoading(false);
      }
    })();
  }, [authToken, loadAccounts]);

  const addNumber = async () => {
    if (!number.trim()) {
      alert("❌ Please enter a number");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/payment-accounts`,
        { method, number: number.trim() },
        { headers }
      );
      setNumber("");
      await loadAccounts();
    } catch (err) {
      alert("❌ " + errMsg(err, "Add failed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (acc) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/payment-accounts/${acc.id}/active`,
        { active: !acc.active },
        { headers }
      );
      await loadAccounts();
    } catch (err) {
      alert("❌ " + errMsg(err, "Update failed"));
    }
  };

  const remove = async (acc) => {
    if (!window.confirm(`${acc.number} মুছে ফেলবেন? (বন্ধ করাই নিরাপদ)`)) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/api/admin/payment-accounts/${acc.id}`,
        { headers }
      );
      await loadAccounts();
    } catch (err) {
      alert("❌ " + errMsg(err, "Delete failed"));
    }
  };

  if (loading) return <div className="text-center p-6">⏳ Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="mb-4">❌ শুধু অ্যাডমিন এই পেজ দেখতে পারবে</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => navigate("/")}
        className="mb-6 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-center mb-6">
        💳 Payment Numbers
      </h2>

      {/* নতুন নম্বর যোগ */}
      <div className="bg-white p-5 rounded-xl shadow-md border mb-6">
        <h3 className="mb-3 font-semibold text-lg text-gray-700">
          নতুন নম্বর যোগ করুন
        </h3>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-3"
        >
          {METHODS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={number}
          placeholder="01XXXXXXXXX"
          onChange={(e) => setNumber(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={addNumber}
          disabled={saving}
          className="mt-3 px-4 py-2 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? "যোগ হচ্ছে..." : "+ Add Number"}
        </button>
      </div>

      {/* মেথড অনুযায়ী লিস্ট */}
      {METHODS.map((m) => {
        const list = accounts.filter((a) => a.method === m.key);
        return (
          <div key={m.key} className="bg-white p-5 rounded-xl shadow-md border mb-6">
            <h3 className={`mb-3 font-semibold text-lg ${m.color}`}>
              {m.label} ({list.length})
            </h3>
            {list.length === 0 && (
              <p className="text-gray-400 text-sm">কোনো নম্বর নেই</p>
            )}
            {list.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between border-b last:border-0 py-2"
              >
                <div>
                  <div className="font-mono">{acc.number}</div>
                  <div className="text-xs text-gray-500">
                    {acc.assignCount} বার দেওয়া হয়েছে
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(acc)}
                    className={`px-3 py-1 rounded text-white text-sm ${
                      acc.active ? "bg-green-600" : "bg-gray-400"
                    }`}
                  >
                    {acc.active ? "চালু" : "বন্ধ"}
                  </button>
                  <button
                    onClick={() => remove(acc)}
                    className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                  >
                    মুছুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
