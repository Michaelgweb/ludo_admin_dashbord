import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useNavigate } from "react-router-dom";

export default function Match() {
  const [entryFee, setEntryFee] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [game, setGame] = useState(null);
  const [playerProfiles, setPlayerProfiles] = useState({ self: {}, opponent: {} });
  const navigate = useNavigate();

  const stompClientRef = useRef(null);
  const pollingRef = useRef(null);
  const timeoutRef = useRef(null);

  const ALLOWED_FEES = [13, 23, 50];
  const token = localStorage.getItem("authToken");

  // নিজের প্রোফাইল লোড
  const fetchOwnProfile = async () => {
    try {
      const res = await axios.get("https://ludo-server-1.onrender.com/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlayerProfiles((prev) => ({ ...prev, self: res.data }));
    } catch (e) {
      console.error("Failed to load own profile:", e);
    }
  };

  // নির্দিষ্ট প্লেয়ার প্রোফাইল লোড
  const fetchPlayerProfile = async (gameId) => {
    try {
      const res = await axios.get(`https://ludo-server-1.onrender.com/api/user/profile/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (e) {
      console.error("Profile fetch error:", e);
      return null;
    }
  };

  // আগের ম্যাচ চেক
  useEffect(() => {
    fetchOwnProfile();
    axios
      .get("https://ludo-server-1.onrender.com/api/match/status", {
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

  // WebSocket কানেকশন
  useEffect(() => {
    if (!game?.gameId) return;

    const socket = new SockJS(`https://ludo-server-1.onrender.com/ludo-ws?token=${token}`);
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        [game.player1, game.player2].forEach((player) => {
          if (player) {
            client.subscribe(`/topic/match/${player}`, async (message) => {
              const payload = JSON.parse(message.body);
              if (payload.status === "CANCELLED") {
                setStatus("❌ ম্যাচ বাতিল হয়েছে");
                return;
              }
              if (payload.player1 && payload.player2) {
                const opponentId =
                  payload.player1 === playerProfiles.self.gameId
                    ? payload.player2
                    : payload.player1;
                const opponentProfile = await fetchPlayerProfile(opponentId);
                setPlayerProfiles((prev) => ({ ...prev, opponent: opponentProfile }));

                // 10 সেকেন্ড কাউন্টডাউন
                let timeLeft = 10;
                setCountdown(timeLeft);
                const timer = setInterval(() => {
                  timeLeft -= 1;
                  setCountdown(timeLeft);
                  if (timeLeft <= 0) {
                    clearInterval(timer);
                    localStorage.setItem("currentSessionId", payload.gameId);
                    localStorage.setItem("entryFee", payload.entryFee);
                    navigate("/game");
                  }
                }, 1000);
              }
            });
          }
        });
      },
    });
    client.activate();
    stompClientRef.current = client;

    return () => client.deactivate();
  }, [game, playerProfiles.self]);

  // ম্যাচ শুরু
  const handleMatchRequest = async (fee) => {
    setEntryFee(fee);
    setLoading(true);
    setStatus("⏳ প্রতিপক্ষ খোঁজা হচ্ছে...");
    setPlayerProfiles((prev) => ({ ...prev, opponent: {} }));

    try {
      await axios.post(
        "http://localhost:8080/api/match/start",
        { entryFee: fee },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      pollingRef.current = setInterval(async () => {
        try {
          const res = await axios.get("https://ludo-server-1.onrender.com/api/match/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.gameId) {
            clearInterval(pollingRef.current);
            setGame(res.data);
          }
        } catch (e) {}
      }, 3000);

      timeoutRef.current = setTimeout(() => {
        clearInterval(pollingRef.current);
        setStatus("⏳ ৩০ মিনিটে প্রতিপক্ষ পাওয়া যায়নি");
        setLoading(false);
      }, 30 * 60 * 1000);
    } catch {
      setStatus("❌ ম্যাচ শুরু করতে সমস্যা হয়েছে");
      setLoading(false);
    }
  };

  const renderAvatar = (profile) => {
    if (profile?.avatarUrl) return `https://ludo-server-1.onrender.com${profile.avatarUrl}`;
    if (profile?.displayName) return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}`;
    return "/default-avatar.png";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <h2 className="text-3xl font-bold text-center text-white mb-6">🎲 লুডু ম্যাচ</h2>

        {/* Player cards */}
        <div className="flex justify-around items-center mb-6">
          {/* Self */}
          <div className="flex flex-col items-center">
            <img
              src={renderAvatar(playerProfiles.self)}
              alt="self-avatar"
              className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-md"
            />
            <span className="mt-2 text-lg font-semibold text-white">
              {playerProfiles.self?.displayName || "You"}
            </span>
          </div>

          <span className="text-yellow-400 text-2xl font-bold">VS</span>

          {/* Opponent */}
          <div className="flex flex-col items-center">
            <img
              src={renderAvatar(playerProfiles.opponent)}
              alt="opponent-avatar"
              className="w-20 h-20 rounded-full border-4 border-yellow-400 shadow-md"
            />
            <span className="mt-2 text-lg font-semibold text-white">
              {playerProfiles.opponent?.displayName || "Opponent"}
            </span>
          </div>
        </div>

        {/* Entry fee buttons */}
        <div className="flex flex-col gap-4 mb-4">
          {ALLOWED_FEES.map((fee) => (
            <button
              key={fee}
              onClick={() => handleMatchRequest(fee)}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                entryFee === fee
                  ? "bg-yellow-400 text-black shadow-lg"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              ৳ {fee}
            </button>
          ))}
        </div>

        {status && <p className="mt-4 text-center text-white font-medium">{status}</p>}
        {countdown !== null && (
          <p className="mt-2 text-center text-yellow-300 text-lg font-bold">
            ম্যাচ শুরু হতে {countdown} সেকেন্ড বাকি...
          </p>
        )}
      </div>
    </div>
  );
}