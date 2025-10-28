import React, { useEffect, useState } from "react";

export default function UserHistory({ onCancel }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const token = localStorage.getItem("authToken");

  // ✅ Use API base URL from .env
  const API_BASE = process.env.REACT_APP_API_BASE_URL;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

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

  useEffect(() => {
    fetchCombinedHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCombinedHistory = async () => {
    setLoading(true);
    setMessage("");

    try {
      const [depositRes, withdrawRes] = await Promise.all([
        fetch(`${API_BASE}/api/deposit/my-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE}/api/withdraw/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!depositRes.ok || !withdrawRes.ok) {
        throw new Error("Failed to load history");
      }

      const [depositData, withdrawData] = await Promise.all([
        depositRes.json(),
        withdrawRes.json(),
      ]);

      const normalizeStatus = (status) =>
        status === "APPROVED" ? "COMPLETED" : status;

      const depositHistory = depositData.map((item) => ({
        id: item.id,
        amount: item.amount,
        method: item.method,
        transactionId: item.transactionId,
        status: normalizeStatus(item.status),
        date: item.requestedAt,
        type: "Deposit",
      }));

      const withdrawHistory = withdrawData.map((item) => ({
        id: item.id,
        amount: item.amount,
        method: item.method,
        transactionId: item.transactionId,
        status: normalizeStatus(item.status),
        date: item.requestedAt,
        type: "Withdraw",
      }));

      const combined = [...depositHistory, ...withdrawHistory].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setHistory(combined);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load transaction history.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    PENDING: "bg-yellow-500",
    REJECTED: "bg-red-600",
    COMPLETED: "bg-green-600",
  };

  const totalItems = history.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📜 My Transaction History
        </h2>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
        >
          ← Back
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : message ? (
        <p className="text-center text-red-600 font-semibold">{message}</p>
      ) : history.length === 0 ? (
        <p className="text-center text-gray-500">No transaction history found.</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white border rounded-xl shadow mb-6">
            <table className="min-w-full text-sm text-left divide-y divide-gray-200">
              <thead className="bg-gray-100 text-gray-700 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {item.type === "Deposit" ? "💰 Deposit" : "🧾 Withdraw"}
                    </td>
                    <td className="px-4 py-2">{item.method}</td>
                    <td className="px-4 py-2 font-semibold">
                      ৳ {Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{item.transactionId || "-"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold text-white rounded ${
                          statusColor[item.status] || "bg-gray-500"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{formatDate(item.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 text-sm font-semibold rounded hover:bg-gray-400 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-gray-700 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-300 text-sm font-semibold rounded hover:bg-gray-400 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
