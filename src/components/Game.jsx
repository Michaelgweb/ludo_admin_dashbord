import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useNavigate } from "react-router-dom";

export default function Match() {
  const [entryFee, setEntryFee] = useState(13);
  const [status, setStatus] = useState("");
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchLogs, setMatchLogs] = useState([]);  // নতুন: ম্যাচ লগস
  const navigate = useNavigate();

  const stompClientRef = useRef(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);
  const logPollingRef = useRef(null); // নতুন: লগ পোলিং রেফ

  const ALLOWED_FEES = [13, 23, 50];

  // আগের ম্যাচ চেক করা
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    axios
      .get("http://localhost:8080/api/match/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.gameId) {
          setGame(res.data);
          setStatus("⚠️ আগের ম্যাচ পাওয়া গেছে, যুক্ত হচ্ছি...");
        }
      })
      .catch(() => {});
  }, []);

  // WebSocket কানেকশন এবং সাবস্ক্রাইব
  useEffect(() => {
    if (!game?.gameId) return;
    const token = localStorage.getItem("authToken");
    const socket = new SockJS(`http://localhost:8080/ludo-ws?token=${token}`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        client.subscribe(`/topic/match/${game.player1}`, (message) => {
          handleMatchMessage(message);
        });
        client.subscribe(`/topic/match/${game.player2}`, (message) => {
          handleMatchMessage(message);
        });
      },
    });
    client.activate();
    stompClientRef.current = client;
    return () => client.deactivate();
  }, [game]);

  // ম্যাচ মেসেজ হ্যান্ডলার (সাধারণ রিয়্যাক্ট স্টেট আপডেট)
  const handleMatchMessage = (message) => {
    const payload = JSON.parse(message.body);
    if (payload.status === "CANCELLED") {
      setStatus("❌ ম্যাচ বাতিল হয়েছে");
      return;
    }
    if (payload.player1 && payload.player2) {
      localStorage.setItem("currentSessionId", payload.gameId);
      localStorage.setItem("entryFee", payload.entryFee);
      navigate("/game");
    }
    // নতুন: লগ আপডেট
    if (payload.logs) {
      setMatchLogs((prevLogs) => [...prevLogs, ...payload.logs]);
    }
  };

  // ম্যাচ শুরু হ্যান্ডলার (ম্যাচ শুরু, পোলিং চালু)
  const handleMatchRequest = async () => {
    if (!ALLOWED_FEES.includes(entryFee)) {
      setStatus("❌ সঠিক এন্ট্রি ফি সিলেক্ট করুন");
      return;
    }
    setLoading(true);
    setStatus("");
    const token = localStorage.getItem("authToken");

    await axios.post(
      "http://localhost:8080/api/match/start",
      { entryFee },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get("http://localhost:8080/api/match/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.gameId) {
          clearInterval(pollingRef.current);
          setGame(res.data);
        }
      } catch {}
    }, 3000);

    timeoutRef.current = setTimeout(() => {
      clearInterval(pollingRef.current);
      setStatus("⏳ ৩০ মিনিটে প্রতিপক্ষ পাওয়া যায়নি");
      setLoading(false);
    }, 30 * 60 * 1000);
  };

  // নতুন: ম্যাচ লগ অটো পোলিং (১০ সেকেন্ডে একবার)
  useEffect(() => {
    if (!game?.gameId) return;
    const token = localStorage.getItem("authToken");

    const fetchMatchLogs = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/api/match/status/${game.gameId}`, // ধরছি এখানে ম্যাচ লগস API আছে
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.logs) {
          setMatchLogs(res.data.logs);
        }
      } catch (e) {
        console.error("Match logs fetch error:", e);
      }
    };

    fetchMatchLogs();
    logPollingRef.current = setInterval(fetchMatchLogs, 10000);

    return () => clearInterval(logPollingRef.current);
  }, [game]);

  // কম্পোনেন্ট আনমাউন্টে ক্লিয়ার
  useEffect(() => {
    return () => {
      clearInterval(pollingRef.current);
      clearTimeout(timeoutRef.current);
      clearInterval(logPollingRef.current);
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          🎲 লুডু ম্যাচ
        </h2>

        <label className="block text-white text-lg mb-2">এন্ট্রি ফি</label>
        <select
          value={entryFee}
          onChange={(e) => setEntryFee(Number(e.target.value))}
          className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
        >
          {ALLOWED_FEES.map((f) => (
            <option key={f} value={f} className="text-black">
              ৳ {f}
            </option>
          ))}
        </select>

        <button
          onClick={handleMatchRequest}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-lg transition-all duration-300 ${
            loading
              ? "bg-yellow-500 cursor-not-allowed"
              : "bg-yellow-400 hover:bg-yellow-500 text-black"
          }`}
        >
          {loading ? "⏳ খোঁজা হচ্ছে..." : "🔍 প্রতিপক্ষ খুঁজুন"}
        </button>

        {status && (
          <p className="mt-4 text-center text-white font-medium">{status}</p>
        )}

        {/* নতুন: ম্যাচ লগস দেখানোর জন্য */}
        {matchLogs.length > 0 && (
          <div className="mt-6 max-h-40 overflow-y-auto bg-black/30 p-3 rounded-md text-white text-sm">
            <h3 className="font-semibold mb-2">ম্যাচ লগস:</h3>
            {matchLogs.map((log, i) => (
              <p key={i} className="border-b border-white/20 py-1">
                {log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
