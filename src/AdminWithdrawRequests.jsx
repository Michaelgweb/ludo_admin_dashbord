// src/AdminWithdrawRequests.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function AdminWithdrawRequests({ onCancel }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // কোন অনুরোধ প্রসেস হচ্ছে (ডাবল ক্লিক ঠেকাতে)
  const [processingId, setProcessingId] = useState(null);

  // Approve/Reject মডাল
  const [modal, setModal] = useState(null); // { req, action }
  const [txnInput, setTxnInput] = useState("");

  const requestsPerPage = 20;
  const token = localStorage.getItem("authToken");

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "N/A";

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

  // ============================================================
  // LOAD  GET /api/withdraw/all
  // ============================================================

  const fetchAllRequests = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/withdraw/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("You are not allowed to view this data. Please login as admin.");
      }

      if (!res.ok) {
        throw new Error(`Failed to load data: ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid withdraw requests response.");
      }

      // Newest first
      data.sort(
        (a, b) =>
          new Date(b.requestedAt || 0).getTime() -
          new Date(a.requestedAt || 0).getTime()
      );

      setRequests(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error loading withdraw requests:", err);
      setMessage(`❌ ${err.message || "Failed to load data."}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  // ============================================================
  // APPROVE / REJECT   POST /api/withdraw/{approve|reject}/{id}
  // ============================================================

  const openModal = (req, action) => {
    setTxnInput("");
    setModal({ req, action });
  };

  const closeModal = () => {
    if (processingId) return;
    setModal(null);
    setTxnInput("");
  };

  const submitAction = async () => {
    if (!modal || processingId) return;

    const { req, action } = modal;
    const txn = txnInput.trim();

    setProcessingId(req.id);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/withdraw/${action}/${req.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(txn ? { transactionId: txn } : {}),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Request failed: ${res.status}`);
      }

      setMessage(
        action === "approve"
          ? `✅ Request #${req.id} approved successfully.`
          : `✅ Request #${req.id} rejected. Balance refunded to user.`
      );

      setModal(null);
      setTxnInput("");
      await fetchAllRequests();
    } catch (err) {
      console.error(`Error on ${action}:`, err);
      setMessage(`❌ ${action} failed: ${err.message}`);
      setModal(null);
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // FILTER + SEARCH + PAGINATION
  // ============================================================

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (!q) return true;

      return [r.id, r.gameId, r.mobile, r.receiverNumber, r.transactionId]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [requests, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / requestsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const currentRequests = filtered.slice(
    (safePage - 1) * requestsPerPage,
    safePage * requestsPerPage
  );

  const renderStatusBadge = (status) => {
    const base = "px-2 py-1 rounded text-xs font-semibold text-white";

    const colors = {
      PENDING: "bg-yellow-500",
      APPROVED: "bg-green-600",
      COMPLETED: "bg-green-600",
      REJECTED: "bg-red-600",
    };

    const labels = {
      PENDING: "Pending",
      APPROVED: "Approved",
      COMPLETED: "Completed",
      REJECTED: "Rejected",
    };

    return (
      <span className={`${base} ${colors[status] || "bg-gray-500"}`}>
        {labels[status] || status || "Unknown"}
      </span>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📤 All Withdraw Requests (Full Log)
          {pendingCount > 0 && (
            <span className="ml-3 bg-yellow-500 text-white text-sm px-2 py-1 rounded-full align-middle">
              {pendingCount} pending
            </span>
          )}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={fetchAllRequests}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
          >
            🔄 Refresh
          </button>

          <button
            onClick={onCancel}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
          >
            ⬅️ Go Back Home
          </button>
        </div>
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

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search ID / Game ID / Mobile / Account / TrxID"
          className="flex-1 min-w-[220px] border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : filtered.length === 0 ? (
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
                {currentRequests.map((req) => {
                  const busy = processingId === req.id;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{req.id}</td>

                      <td className="px-4 py-2 text-indigo-600 font-semibold">
                        {req.gameId || "N/A"}
                      </td>

                      <td className="px-4 py-2">{req.mobile || "N/A"}</td>

                      <td className="px-4 py-2">
                        ৳ {Number(req.amount || 0).toFixed(2)}
                      </td>

                      <td className="px-4 py-2">{req.method || "N/A"}</td>

                      <td className="px-4 py-2">{req.transactionId || "-"}</td>

                      <td className="px-4 py-2">
                        {req.receiverNumber || "N/A"}
                      </td>

                      <td className="px-4 py-2">
                        {renderStatusBadge(req.status)}
                      </td>

                      <td className="px-4 py-2">
                        {formatDate(req.requestedAt)}
                      </td>

                      <td className="px-4 py-2 space-y-1 min-w-[110px]">
                        {req.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => openModal(req, "approve")}
                              disabled={busy || !!processingId}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-semibold w-full"
                            >
                              {busy ? "Wait..." : "Approve"}
                            </button>

                            <button
                              onClick={() => openModal(req, "reject")}
                              disabled={busy || !!processingId}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-semibold w-full"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-500 text-xs">✔ Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safePage === 1}
              className={`px-4 py-2 rounded ${
                safePage === 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Previous
            </button>

            <span className="self-center text-gray-700">
              Page {safePage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage === totalPages}
              className={`px-4 py-2 rounded ${
                safePage === totalPages
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Approve / Reject modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {modal.action === "approve" ? "Approve" : "Reject"} Request #
              {modal.req.id}
            </h3>

            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>
                Game ID:{" "}
                <span className="font-semibold">{modal.req.gameId}</span>
              </p>
              <p>
                Amount:{" "}
                <span className="font-semibold">
                  ৳ {Number(modal.req.amount || 0).toFixed(2)}
                </span>
              </p>
              <p>
                {modal.req.method} →{" "}
                <span className="font-semibold">{modal.req.receiverNumber}</span>
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction ID {modal.action === "approve" ? "(optional)" : "/ note (optional)"}
            </label>
            <input
              type="text"
              value={txnInput}
              onChange={(e) => setTxnInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAction()}
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. BK123ABC45"
            />

            {modal.action === "reject" && (
              <p className="text-xs text-red-600 mt-2">
                Rejecting will refund the amount to the user's balance.
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                disabled={!!processingId}
                className="px-4 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>

              <button
                onClick={submitAction}
                disabled={!!processingId}
                className={`px-4 py-2 rounded-md text-sm text-white font-semibold disabled:opacity-60 ${
                  modal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processingId
                  ? "Processing..."
                  : modal.action === "approve"
                  ? "Confirm Approve"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
