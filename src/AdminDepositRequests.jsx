import React, { useState, useEffect } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function AdminDepositRequests({ onCancel }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updateMethod, setUpdateMethod] = useState("bkash");
  const [updateNumber, setUpdateNumber] = useState("");
  const requestsPerPage = 20;

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetchAllDeposits();
  }, []);

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

  const fetchAllDeposits = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/deposit/all-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load deposits");
      const data = await res.json();

      data.sort((a, b) => {
        const dateDiff =
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id - a.id;
      });

      setRequests(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch Error:", err);
      setMessage("❌ Failed to load deposits.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/deposit/${action}/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${action} failed`);
      setMessage(`✅ ${action} successful!`);
      fetchAllDeposits();
    } catch (err) {
      setMessage(`❌ Failed to ${action}`);
    }
  };

  const handleUpdatePayment = async (gameId) => {
    if (!updateNumber) {
      setMessage("❌ Enter a valid number.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/payment-config/update-by-gameid?gameId=${gameId}&method=${updateMethod}&number=${updateNumber}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setMessage(`✅ Payment config updated: ${data.method} - ${data.number}`);
      fetchAllDeposits();
    } catch (err) {
      setMessage(`❌ Failed to update payment config: ${err.message}`);
    }
  };

  const renderStatusBadge = (status) => {
    const base = "px-2 py-1 rounded text-xs font-semibold";
    switch (status) {
      case "APPROVED":
        return <span className={`${base} bg-green-500 text-white`}>Completed</span>;
      case "REJECTED":
        return <span className={`${base} bg-red-500 text-white`}>Rejected</span>;
      case "PENDING":
        return <span className={`${base} bg-yellow-400 text-gray-900`}>Pending</span>;
      default:
        return <span className={`${base} bg-gray-400 text-white`}>{status || "N/A"}</span>;
    }
  };

  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(requests.length / requestsPerPage);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onCancel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded shadow"
        >
          ⬅ Back to Home
        </button>
        <h2 className="text-2xl font-bold">🧾 All Deposit Requests (Full Log)</h2>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded text-center font-semibold ${
            message.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="mb-4 flex space-x-2 items-center">
        <select
          value={updateMethod}
          onChange={(e) => setUpdateMethod(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="bkash">Bkash</option>
          <option value="rocket">Rocket</option>
          <option value="nagad">Nagad</option>
        </select>
        <input
          type="text"
          placeholder="Number"
          value={updateNumber}
          onChange={(e) => setUpdateNumber(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {loading && <p className="text-center text-gray-500">Loading...</p>}
      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-500">No deposit records found.</p>
      )}

      {!loading && requests.length > 0 && (
        <>
          <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="py-3 px-4 text-center">ID</th>
                  <th className="py-3 px-4 text-center">Game ID</th>
                  <th className="py-3 px-4 text-center">Mobile</th>
                  <th className="py-3 px-4 text-center">Amount</th>
                  <th className="py-3 px-4 text-center">Method</th>
                  <th className="py-3 px-4 text-center">Txn ID</th>
                  <th className="py-3 px-4 text-center">Sender Number</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Requested At</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-2 px-4 text-center">{req.id}</td>
                    <td className="py-2 px-4 text-center text-indigo-600 font-semibold">
                      {req.gameId || "N/A"}
                    </td>
                    <td className="py-2 px-4 text-center">{req.mobile || "N/A"}</td>
                    <td className="py-2 px-4 text-center font-semibold text-green-600">
                      ৳ {Number(req.amount).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-center">{req.method || "N/A"}</td>
                    <td className="py-2 px-4 text-center">{req.transactionId || "N/A"}</td>
                    <td className="py-2 px-4 text-center">{req.senderNumber || "N/A"}</td>
                    <td className="py-2 px-4 text-center">{renderStatusBadge(req.status)}</td>
                    <td className="py-2 px-4 text-center">{formatDate(req.requestedAt)}</td>
                    <td className="py-2 px-4 text-center space-x-2">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(req.id, "approve")}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "reject")}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleUpdatePayment(req.gameId)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Update Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded ${
                currentPage === 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Previous
            </button>
            <span className="self-center text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded ${
                currentPage === totalPages
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
