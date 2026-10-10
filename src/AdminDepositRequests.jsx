import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const STATUSES = [
  { key: "", label: "সব" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLE = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

const METHOD_STYLE = {
  BKASH: "text-pink-600",
  NAGAD: "text-orange-600",
  ROCKET: "text-purple-600",
  UPAY: "text-green-600",
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString("en-GB") : "-");

export default function AdminDepositRequests() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // সার্চ বাটনে চাপলে সেট হয়
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [role, setRole] = useState("");

  const authToken = localStorage.getItem("authToken");
  const navigate = useNavigate();
  const reqSeq = useRef(0);

  const isStaff = ["ADMIN", "STAFF"].includes(role.toUpperCase());

  const errMsg = (err, fallback) => {
    if (err.response?.status === 403) return "Permission denied";
    return err.response?.data?.message || fallback;
  };

  // ---------- role ----------
  useEffect(() => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      .then((res) => setRole(res.data.role || ""))
      .catch(() => setLoading(false));
  }, [authToken]);

  // ---------- load ----------
  const load = useCallback(
    async (silent = false) => {
      if (!authToken) return;
      const seq = ++reqSeq.current;
      if (!silent) setLoading(true);
      try {
        const params = { page, size: 30 };
        if (status) params.status = status;

        let url = `${API_BASE_URL}/api/deposit/admin`;
        if (query.trim()) {
          url = `${API_BASE_URL}/api/deposit/admin/search`;
          params.q = query.trim();
        }

        const res = await axios.get(url, {
          params,
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (seq !== reqSeq.current) return; // পুরনো রিকোয়েস্টের উত্তর বাদ
        setRows(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      } catch (err) {
        if (!silent) alert("❌ " + errMsg(err, "Failed to load"));
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [authToken, page, status, query]
  );

  useEffect(() => {
    if (isStaff) load();
  }, [isStaff, load]);

  // নতুন ডিপোজিট দেখতে প্রতি ১৫ সেকেন্ডে চুপচাপ রিফ্রেশ
  useEffect(() => {
    if (!isStaff) return;
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [isStaff, load]);

  // ---------- actions ----------
  const approve = async (d) => {
    const warn = d.userTransactionId
      ? ""
      : "\n⚠️ ইউজার এখনো TrxID জমা দেয়নি!";
    if (
      !window.confirm(
        `${d.gameId} এর ৳${d.amount} (${d.method}) অ্যাপ্রুভ করবেন?\nTrxID: ${
          d.userTransactionId || "-"
        }${warn}`
      )
    )
      return;

    setBusyId(d.id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/deposit/admin/${d.id}/approve`,
        { note: "Manual approve" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await load(true);
    } catch (err) {
      alert("❌ " + errMsg(err, "Approve failed"));
      await load(true);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (d) => {
    const reason = window.prompt(`${d.gameId} এর ডিপোজিট রিজেক্টের কারণ:`);
    if (reason === null) return; // Cancel চাপলে কিছু হবে না

    setBusyId(d.id);
    try {
      await axios.post(
        `${API_BASE_URL}/api/deposit/admin/${d.id}/reject`,
        { reason: reason.trim() || "Rejected by admin" },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      await load(true);
    } catch (err) {
      alert("❌ " + errMsg(err, "Reject failed"));
      await load(true);
    } finally {
      setBusyId(null);
    }
  };

  const doSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setQuery(q);
  };

  const clearSearch = () => {
    setQ("");
    setQuery("");
    setPage(0);
  };

  const changeStatus = (key) => {
    setStatus(key);
    setPage(0);
  };

  // ---------- render ----------
  if (!authToken) {
    return <div className="text-center p-6">❌ লগইন করুন</div>;
  }

  if (!loading && !isStaff) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="mb-4">❌ শুধু অ্যাডমিন/সাপোর্ট এই পেজ দেখতে পারবে</p>
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
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold">💰 Deposit Requests</h2>
        <button
          onClick={() => load()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
        >
          ↻ Refresh
        </button>
      </div>

      {/* সার্চ */}
      <form onSubmit={doSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Game ID / মোবাইল / DEP1234567 / TrxID"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            ✕ Clear
          </button>
        )}
      </form>

      {/* স্ট্যাটাস ফিল্টার */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => changeStatus(s.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
              status === s.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">
          মোট: {totalElements}
        </span>
      </div>

      {/* টেবিল */}
      <div className="bg-white rounded-xl shadow-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3">সময়</th>
              <th className="p-3">Server ID</th>
              <th className="p-3">User</th>
              <th className="p-3">Method</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">পেমেন্ট নম্বর</th>
              <th className="p-3">TrxID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  ⏳ Loading...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-400">
                  কোনো ডিপোজিট নেই
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50 align-top">
                  <td className="p-3 whitespace-nowrap">
                    <div>{fmtDate(d.createdAt)}</div>
                    {d.processedAt && (
                      <div className="text-xs text-gray-400">
                        প্রসেস: {fmtDate(d.processedAt)}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono">{d.transactionId}</td>
                  <td className="p-3">
                    <div className="font-medium">{d.gameId}</div>
                    <div className="text-xs text-gray-500">{d.mobile}</div>
                  </td>
                  <td
                    className={`p-3 font-semibold ${
                      METHOD_STYLE[d.method] || ""
                    }`}
                  >
                    {d.method}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ৳{d.amount}
                  </td>
                  <td className="p-3 font-mono">{d.paymentAccountNumber}</td>
                  <td className="p-3 font-mono">
                    {d.userTransactionId || (
                      <span className="text-gray-400">জমা দেয়নি</span>
                    )}
                    {d.submittedAt && (
                      <div className="text-xs text-gray-400 font-sans">
                        {fmtDate(d.submittedAt)}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        STATUS_STYLE[d.status] || ""
                      }`}
                    >
                      {d.status}
                    </span>
                    {d.status === "APPROVED" && (
                      <div className="text-xs text-gray-500 mt-1">
                        {d.autoApproved ? "🤖 অটো" : "👤 ম্যানুয়াল"}
                      </div>
                    )}
                    {d.note && (
                      <div className="text-xs text-gray-500 mt-1 max-w-[140px]">
                        {d.note}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {d.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === d.id}
                          onClick={() => approve(d)}
                          className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        >
                          ✔ Approve
                        </button>
                        <button
                          disabled={busyId === d.id}
                          onClick={() => reject(d)}
                          className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                        >
                          ✖ Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* পেজিনেশন */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-40"
          >
            ← আগের
          </button>
          <span className="text-sm">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-40"
          >
            পরের →
          </button>
        </div>
      )}
    </div>
  );
      }
