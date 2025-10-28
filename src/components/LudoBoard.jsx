// src/components/LudoBoard.jsx
import React, { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

export default function LudoBoard({ gameId: propGameId, sessionId: propSessionId, token: propToken }) {
  const [boardState, setBoardState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerProfiles, setPlayerProfiles] = useState({ self: {}, opponent: {} });
  const [diceValue, setDiceValue] = useState(null);
  const [diceOwner, setDiceOwner] = useState(null);
  const [diceHistory, setDiceHistory] = useState({ 1: [], 2: [] });

  const opponentCacheRef = useRef(null);
  const stompClientRef = useRef(null);

  const token = propToken || localStorage.getItem("authToken");
  const sessionId = propSessionId || localStorage.getItem("currentSessionId");
  const gameId = propGameId || localStorage.getItem("currentGameId");

  const renderAvatar = (profile) => {
    if (profile?.avatarUrl) return `${API_BASE}${profile.avatarUrl}`;
    if (profile?.displayName)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}`;
    return "/default-avatar.png";
  };

  const fetchOwnProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch {
      return null;
    }
  };

  const fetchOpponentProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/match/opponent/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data; // backend already sends gameId, displayName, avatarUrl
    } catch {
      return null;
    }
  };

  const loadProfiles = async () => {
    const selfProfile = await fetchOwnProfile();
    let oppProfile = opponentCacheRef.current;

    if (!oppProfile) {
      oppProfile = await fetchOpponentProfile();
      opponentCacheRef.current = oppProfile;
    }

    setPlayerProfiles({
      self: selfProfile || {},
      opponent: oppProfile || {},
    });
  };

  useEffect(() => {
    if (!token || !sessionId) return;
    loadProfiles();

    const socket = new SockJS(`${API_BASE}/ludo-ws?token=${encodeURIComponent(token)}`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe(`/topic/game/${sessionId}`, (msg) => {
          try {
            const state = JSON.parse(msg.body);
            setBoardState(state.playerTokens || []);
            setCurrentPlayer(state.currentPlayer ?? 0);
            setGameOver(state.gameOver || false);

            if (state.lastDiceValue !== undefined && state.currentPlayer !== undefined) {
              setDiceValue(state.lastDiceValue);
              setDiceOwner(state.currentPlayer);
              setDiceHistory((prev) => ({
                ...prev,
                [state.currentPlayer]: [...(prev[state.currentPlayer] || []), state.lastDiceValue],
              }));
            }
          } catch (err) {
            console.error("Error parsing game state:", err);
          }
        });
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;
    return () => stompClient.deactivate();
  }, [sessionId, token]);

  const rollDice = () => {
    axios
      .post(`${API_BASE}/api/game/roll/${sessionId}`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .catch((err) => alert(err.response?.data || "Error rolling dice"));
  };

  const sendMove = (tokenIndex) => {
    if (!diceValue) {
      alert("First roll the dice!");
      return;
    }
    stompClientRef.current?.publish({
      destination: "/app/game/move",
      body: JSON.stringify({
        gameId: sessionId,
        playerId: currentPlayer,
        tokenIndex: tokenIndex,
        diceValue: diceValue,
      }),
    });
    setDiceValue(null);
    setDiceOwner(null);
  };

  const cancelGame = () => {
    if (!window.confirm("Are you sure you want to cancel the game?")) return;
    axios
      .post(`${API_BASE}/api/game/leave`, { gameId: sessionId }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        localStorage.removeItem("currentSessionId");
        localStorage.removeItem("currentGameId");
        window.location.href = "/";
      })
      .catch((err) => alert("Error cancelling game: " + (err.response?.data || err.message)));
  };

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h2 className="text-3xl font-bold mb-4">🎉 Game Over 🎉</h2>
        <button
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-indigo-600"
          onClick={() => (window.location.href = "/")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen flex flex-col bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900">
      {/* Opponent */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={renderAvatar(playerProfiles.opponent)}
          alt="opponent-avatar"
          className="w-24 h-24 rounded-full"
        />
        <span className="mt-2 text-lg font-bold text-white">
          {playerProfiles.opponent?.displayName || "Opponent"}
        </span>
        {diceOwner === 2 && diceValue && (
          <span className="mt-1 text-xl font-bold text-yellow-300">🎲 {diceValue}</span>
        )}
      </div>

      {/* Board */}
      <div className="flex-grow bg-white rounded-lg shadow-lg p-4 mb-6">
        {boardState ? (
          <div className="grid grid-cols-2 gap-6">
            {boardState.map((tokens, playerIdx) => {
              const playerNumber = playerIdx + 1;
              const profile = playerNumber === 1 ? playerProfiles.self : playerProfiles.opponent;
              return (
                <div
                  key={playerIdx}
                  className={`p-4 rounded-lg border-2 ${
                    currentPlayer === playerNumber ? "border-yellow-500" : "border-gray-300"
                  }`}
                >
                  <h4
                    className={`text-lg font-bold mb-4 ${
                      currentPlayer === playerNumber ? "text-yellow-500" : "text-gray-600"
                    }`}
                  >
                    {profile?.displayName || `Player ${playerNumber}`}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {tokens.map((pos, tokenIdx) => (
                      <button
                        key={tokenIdx}
                        onClick={() => sendMove(tokenIdx)}
                        disabled={currentPlayer !== playerNumber}
                        className={`px-3 py-2 rounded-lg border ${
                          currentPlayer === playerNumber
                            ? "bg-yellow-400 text-black hover:bg-yellow-500"
                            : "bg-gray-200 text-gray-600 cursor-not-allowed"
                        }`}
                      >
                        Token {tokenIdx + 1} ({pos})
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Rolls: {diceHistory[playerNumber]?.join(", ") || "No rolls yet"}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-300">Waiting for game to start...</p>
        )}
      </div>

      {/* Player */}
      <div className="flex flex-col items-center mt-4">
        <img
          src={renderAvatar(playerProfiles.self)}
          alt="self-avatar"
          className="w-24 h-24 rounded-full"
        />
        <span className="mt-2 text-lg font-bold text-white">
          {playerProfiles.self?.displayName || "You"}
        </span>
        {diceOwner === 1 && diceValue && (
          <span className="mt-1 text-xl font-bold text-yellow-300">🎲 {diceValue}</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={rollDice}
          className="px-4 py-2 rounded-lg text-white bg-yellow-500 hover:bg-yellow-600"
        >
          🎲 Roll Dice
        </button>
        <button
          onClick={cancelGame}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 ml-4"
        >
          🔙 Back
        </button>
      </div>
    </div>
  );
}

