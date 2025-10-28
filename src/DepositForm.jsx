import React, { useEffect, useState } from "react";
import axios from "axios";

export default function DepositForm({ token, onCancel }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");
  const [paymentNumbers, setPaymentNumbers] = useState({});

  // ✅ API Base URL from .env
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // ✅ Fetch payment numbers
  useEffect(() => {
    if (!token) return;

    axios
      .get(`${API_BASE_URL}/api/deposit/payment-config`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const numbers = {};
        res.data.forEach((config) => {
          numbers[config.method] = config.number;
        });
        setPaymentNumbers(numbers);
      })
      .catch((err) => {
        console.error("Error loading payment numbers:", err);
        setMessage("❌ Failed to load payment numbers");
      });
  }, [token, API_BASE_URL]);

  // ✅ Copy payment number
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Number copied to clipboard!");
  };

  // ✅ Submit deposit request
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      amount: parseFloat(amount),
      method,
      senderNumber,
      transactionId,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/deposit/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data.error || "Deposit failed"}`);
        return;
      }

      setMessage("✅ Deposit request sent! Your balance will be updated within 5-30 minutes.");
      setAmount("");
      setSenderNumber("");
      setTransactionId("");
    } catch (err) {
      console.error("Deposit error:", err);
      setMessage("❌ Deposit failed. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-3xl font-bold text-center text-green-700 mb-2">
        Send Money 💰
      </h2>
      <p className="text-center text-sm text-red-600 font-semibold mb-6">
        বিশেষ দ্রষ্টব্য: সেন্ড মানি টাকা গ্রহণ করা হয়
      </p>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded text-sm font-medium text-center ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            placeholder="Enter amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-200"
          >
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>

        {/* Show Payment Number */}
        {paymentNumbers[method] && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-base text-gray-800">
            এই নাম্বারে টাকা পাঠান:{" "}
            <span className="font-bold">{paymentNumbers[method]}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(paymentNumbers[method])}
              className="ml-3 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Copy
            </button>
          </div>
        )}

        {/* Sender Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sender Number
          </label>
          <input
            type="text"
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            required
            placeholder="Your mobile number"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>

        {/* Transaction ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction ID
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            required
            placeholder="Enter transaction ID"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-200"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded-lg shadow"
          >
            ✅ Submit
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-5 rounded-lg shadow"
          >
            ⬅ Back
          </button>
        </div>
      </form>
    </div>
  );
}
