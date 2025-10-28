// src/components/Match.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Match() {
  const [entryFee, setEntryFee] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState({ self: {}, opponent: {} });
  const [showPlayers, setShowPlayers] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [countdown, setCountdown] = useState(null);

  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const slideshowRef = useRef(null);
  const countdownRef = useRef(null);
  const pollingRef = useRef(null);

  const ALLOWED_FEES = [13, 23, 50];
  const authToken = localStorage.getItem("authToken") || "";
  const [playerGameId, setPlayerGameId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const SLIDESHOW_IMAGES = [
    "/slides/slide1.png",
    "/slides/slide2.png",
    "/slides/slide3.png",
    "/slides/slide4.png",
    "/slides/slide5.png"
  ];

  // ===== API =====
  const fetchOwnProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return res.data;
    } catch {
      return null;
    }
  };

  const fetchPlayerProfile = async (gameId) => {
    if (!gameId) return null;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/profile/${gameId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return res.data;
    } catch {
      return null;
    }
  };

  // ===== Helpers =====
  const resetIntervals = () => {
    if (stompClientRef.current?.active) stompClientRef.current.deactivate();
    clearInterval(slideshowRef.current);
    clearInterval(countdownRef.current);
    clearInterval(pollingRef.current);
    setCountdown(null);
  };

  const startCountdown = (initialSeconds) => {
    clearInterval(countdownRef.current);
    let timeLeft = initialSeconds;
    setCountdown(timeLeft);
    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownRef.current);
        navigate("/game");
      }
    }, 1000);
  };

  const pollMatchStatus = (sessionId) => {
    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/match/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const payload = res.data;

        if (payload.status === "MATCH_FOUND" && payload.matchStartTimestamp) {
          const opponentId =
            payload.player1GameId === playerGameId ? payload.player2GameId : payload.player1GameId;
          const opponentProfile = await fetchPlayerProfile(opponentId);
          setPlayerProfiles((prev) => ({ ...prev, opponent: opponentProfile || prev.opponent }));

          let timeLeft = Math.floor((payload.matchStartTimestamp - Date.now()) / 1000);
          if (timeLeft < 0) timeLeft = 0;
          startCountdown(timeLeft);
        }

        if (payload.status === "ONGOING") {
          localStorage.setItem("currentSessionId", payload.sessionId);
          localStorage.setItem("currentGameId", playerGameId);
          localStorage.setItem("entryFee", payload.entryFee);
          navigate("/game");
        }
      } catch {
        // ignore
      }
    }, 3000);
  };

  const connectWebSocket = (selfId, token) => {
    if (!token || !selfId) return;
    if (stompClientRef.current?.active) stompClientRef.current.deactivate();

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ludo-ws?token=${encodeURIComponent(token)}`),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/match/${selfId}`, async (message) => {
          const payload = JSON.parse(message.body);

          if (payload.status === "WAITING") {
            setStatus("⏳ Searching for opponent...");
            return;
          }

          if (payload.status === "MATCH_FOUND" && payload.matchStartTimestamp) {
            // opponent profile load
            const opponentId =
              payload.player1GameId === selfId ? payload.player2GameId : payload.player1GameId;
            const opponentProfile = await fetchPlayerProfile(opponentId);
            setPlayerProfiles((prev) => ({ ...prev, opponent: opponentProfile || prev.opponent }));

            // session id update
            setCurrentSessionId(payload.sessionId);
            localStorage.setItem("currentSessionId", payload.sessionId);
            localStorage.setItem("currentGameId", selfId);
            localStorage.setItem("entryFee", entryFee);

            setShowPlayers(true);
            setStatus("🎯 Opponent found!");
            clearInterval(slideshowRef.current);

            let timeLeft = Math.floor((payload.matchStartTimestamp - Date.now()) / 1000);
            if (timeLeft < 0) timeLeft = 0;
            startCountdown(timeLeft);
            return;
          }

          if (payload.status === "ONGOING") {
            localStorage.setItem("currentSessionId", payload.sessionId);
            localStorage.setItem("currentGameId", selfId);
            localStorage.setItem("entryFee", payload.entryFee);
            navigate("/game");
          }
        });
      }
    });

    stompClientRef.current = client;
    client.activate();
  };

  // ===== Actions =====
  const handleMatchRequest = async (fee) => {
    setEntryFee(fee);
    setShowPlayers(true);
    setLoading(true);
    setStatus("⏳ Searching for opponent...");
    setPlayerProfiles((prev) => ({ ...prev, opponent: {} }));

    slideshowRef.current = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, 1000);

    const selfProfile = await fetchOwnProfile();
    if (!selfProfile?.gameId) {
      setStatus("❌ Failed to load profile");
      setLoading(false);
      return;
    }
    setPlayerGameId(selfProfile.gameId);
    setPlayerProfiles((prev) => ({ ...prev, self: selfProfile }));

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/match/start`,
        { entryFee: fee },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data.sessionId) {
        setCurrentSessionId(res.data.sessionId);
        localStorage.setItem("currentSessionId", res.data.sessionId);
        localStorage.setItem("currentGameId", selfProfile.gameId);
        localStorage.setItem("entryFee", fee);
        pollMatchStatus(res.data.sessionId);
      }

      // connect after sending request
      connectWebSocket(selfProfile.gameId, authToken);
      setLoading(false);
    } catch {
      resetIntervals();
      setStatus("❌ Failed to start match");
      setLoading(false);
    }
  };

  const backToHome = () => {
    resetIntervals();
    setShowPlayers(false);
    setStatus("");
    setLoading(false);
    setEntryFee(null);
    setPlayerProfiles((prev) => ({ self: prev.self, opponent: {} }));
  };

  const renderAvatar = (profile) => {
    if (profile?.avatarUrl) return `${API_BASE_URL}${profile.avatarUrl}`;
    if (profile?.displayName)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}`;
    return "/default-avatar.png";
  };

  useEffect(() => {
    fetchOwnProfile().then((profile) => {
      if (profile?.gameId) {
        setPlayerGameId(profile.gameId);
        setPlayerProfiles((prev) => ({ ...prev, self: profile }));
      }
    });
    return () => resetIntervals();
  }, []);

  // ===== UI =====
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 p-6">
      <style>{`
        @keyframes pulseBounceGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px gold; }
          50% { transform: scale(1.08); box-shadow: 0 0 35px gold; }
        }
        .avatar-anim { animation: pulseBounceGlow 1.2s infinite ease-in-out; border: 4px solid gold; }
      `}</style>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <h2 className="text-3xl font-bold text-center text-white mb-6">🎲 Ludo Match</h2>

        {!showPlayers ? (
          <>
            {ALLOWED_FEES.map((fee) => (
              <button
                key={fee}
                onClick={() => handleMatchRequest(fee)}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-lg mb-3 ${
                  entryFee === fee
                    ? "bg-yellow-400 text-black"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                ৳ {fee}
              </button>
            ))}
            <button
              onClick={() => navigate("/")}
              className="mt-4 w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              🔙 Back
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-around items-center mb-6">
              <div className="flex flex-col items-center">
                <img
                  src={renderAvatar(playerProfiles.self)}
                  alt="self-avatar"
                  className="w-32 h-32 rounded-full avatar-anim"
                />
                <span className="mt-3 text-xl font-bold text-white">
                  {playerProfiles.self?.displayName || "You"}
                </span>
              </div>

              <span className="text-yellow-400 text-3xl font-extrabold">VS</span>

              <div className="flex flex-col items-center">
                <img
                  src={
                    playerProfiles.opponent?.displayName
                      ? renderAvatar(playerProfiles.opponent)
                      : SLIDESHOW_IMAGES[slideshowIndex]
                  }
                  alt="opponent-avatar"
                  className="w-32 h-32 rounded-full avatar-anim"
                />
                <span className="mt-3 text-xl font-bold text-white">
                  {playerProfiles.opponent?.displayName || "Waiting..."}
                </span>
              </div>
            </div>

            {countdown !== null && (
              <p className="mt-2 text-center text-yellow-300 text-lg font-bold">
                Match starts in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            )}

            {status && <p className="mt-4 text-center text-white">{status}</p>}

            <button
              onClick={backToHome}
              className="mt-4 w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              🔙 Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}