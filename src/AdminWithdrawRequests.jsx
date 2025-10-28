import React, { useEffect, useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function AdminWithdrawRequests({ onCancel }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 20;

  const token = localStorage.getItem("authToken");

  // Date formatting helper
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
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
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/withdraw/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);

      const data = await res.json();

      // Sort newest first
      data.sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      setRequests(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error loading withdraw requests:", err);
      setMessage("❌ Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setMessage("");
    const url = `${API_BASE_URL}/api/withdraw/${action}/${id}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      setMessage(`✅ Request ${action} completed successfully.`);
      // Reload all requests but keep full history
      fetchAllRequests();
    } catch (err) {
      console.error(`Error on ${action}:`, err);
      setMessage(`❌ ${action} failed: ${err.message}`);
    }
  };

  const renderStatusBadge = (status) => {
    const base = "px-2 py-1 rounded text-xs font-semibold text-white";
    const colors = {
      PENDING: "bg-yellow-500",
      APPROVED: "bg-blue-600",
      REJECTED: "bg-red-600",
      COMPLETED: "bg-green-600",
    };
    const statusLabels = {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      COMPLETED: "Completed",
    };
    return (
      <span className={`${base} ${colors[status] || "bg-gray-500"}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Pagination Logic
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requests.slice(
    indexOfFirstRequest,
    indexOfLastRequest
  );
  const totalPages = Math.ceil(requests.length / requestsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📤 All Withdraw Requests (Full Log)
        </h2>
        <button
          onClick={onCancel}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
        >
          ⬅️ Go Back Home
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-3 mb-6 rounded-md font-medium ${
            message.includes("❌")
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-center text-gray-500">No requests found.</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Game ID</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Account Number</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested At</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{req.id}</td>
                    <td className="px-4 py-2 text-indigo-600 font-semibold">
                      {req.gameId || "N/A"}
                    </td>
                    <td className="px-4 py-2">{req.mobile || "N/A"}</td>
                    <td className="px-4 py-2">
                      ৳ {Number(req.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{req.method || "N/A"}</td>
                    <td className="px-4 py-2">{req.transactionId || "-"}</td>
                    <td className="px-4 py-2">{req.receiverNumber || "N/A"}</td>
                    <td className="px-4 py-2">{renderStatusBadge(req.status)}</td>
                    <td className="px-4 py-2">{formatDate(req.requestedAt)}</td>
                    <td className="px-4 py-2 space-y-1">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAction(req.id, "approve")}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold w-full"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(req.id, "reject")}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold w-full"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === "APPROVED" && (
                        <button
                          onClick={() => handleAction(req.id, "complete")}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold w-full"
                        >
                          Complete
                        </button>
                      )}
                      {(req.status === "REJECTED" || req.status === "COMPLETED") && (
                        <span className="text-gray-500 text-xs">✔ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
