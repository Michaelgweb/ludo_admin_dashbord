import React, { useEffect, useState } from "react";

export default function AdminUserHistory({ onCancel }) {
  const [combinedHistory, setCombinedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const token = localStorage.getItem("authToken");

  // Use API base URL from env variable
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setMessage("");

    try {
      const withdrawRes = await fetch(`${API_BASE_URL}/api/withdraw/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const depositRes = await fetch(`${API_BASE_URL}/api/deposit/all-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!withdrawRes.ok || !depositRes.ok) {
        throw new Error("Failed to load data.");
      }

      const withdrawData = await withdrawRes.json();
      const depositData = await depositRes.json();

      const normalizeStatus = (status) => {
        if (!status) return "UNKNOWN";
        if (status === "APPROVED") return "COMPLETED";
        return status;
      };

      const formatDateSafe = (date) => {
        if (!date) return null;
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const formattedWithdraws = withdrawData.map((item) => ({
        id: `W-${item.id}`,
        type: "Withdraw",
        gameId: item.gameId || "N/A",
        number: item.receiverNumber || "-",
        date: formatDateSafe(item.requestedAt || item.requestTime),
        status: normalizeStatus(item.status),
        amount: Number(item.amount) || 0,
        method: item.method || "-",
        transactionId: item.transactionId || "-",
      }));

      const formattedDeposits = depositData.map((item) => ({
        id: `D-${item.id}`,
        type: "Deposit",
        gameId: item.gameId || "N/A",
        number: item.senderNumber || "-",
        date: formatDateSafe(item.requestedAt || item.requestTime),
        status: normalizeStatus(item.status),
        amount: Number(item.amount) || 0,
        method: item.method || "-",
        transactionId: item.transactionId || "-",
      }));

      const allCombined = [...formattedWithdraws, ...formattedDeposits]
        .filter(item => item.date) // only valid dates
        .sort((a, b) => b.date - a.date); // newest first

      setCombinedHistory(allCombined);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    const colors = {
      PENDING: "bg-yellow-400 text-yellow-900",
      COMPLETED: "bg-green-600 text-white",
      REJECTED: "bg-red-600 text-white",
      UNKNOWN: "bg-gray-400 text-white",
    };

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
          colors[status] || colors.UNKNOWN
        }`}
      >
        {status}
      </span>
    );
  };

  const totalItems = combinedHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = combinedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDisplayDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-gray-50 min-h-screen rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          📊 User Transaction History
        </h1>
        <button
          onClick={onCancel}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md transition"
        >
          ← Back to Home
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="ml-3 text-indigo-600 text-lg font-semibold">
            Loading...
          </span>
        </div>
      ) : message ? (
        <p className="text-center text-red-600 font-semibold text-lg">{message}</p>
      ) : (
        <>
          <div className="bg-white shadow-lg rounded-xl overflow-auto border border-gray-200 mb-8">
            <table className="min-w-[1100px] w-full text-sm text-gray-700">
              <thead className="bg-gray-100 text-xs text-gray-700 uppercase sticky top-0 z-10 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Game ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Number</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedData.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-indigo-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {totalItems - ((currentPage - 1) * itemsPerPage + index)}
                    </td>
                    <td className="px-6 py-4">
                      {item.type === "Deposit" ? "💰 Deposit" : "🧾 Withdraw"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-indigo-700">
                      {item.gameId}
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600">
                      ৳ {item.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">{item.method}</td>
                    <td className="px-6 py-4 truncate max-w-[150px]">
                      {item.transactionId}
                    </td>
                    <td className="px-6 py-4">{item.number}</td>
                    <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDisplayDate(item.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-6 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition ${
                currentPage === 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              ← Previous
            </button>

            <span className="text-gray-700 font-medium text-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-5 py-2 rounded-md text-sm font-semibold transition ${
                currentPage === totalPages
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
