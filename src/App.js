// File: src/App.js
import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import Home from "./Home";
import AdminDepositRequests from "./AdminDepositRequests";
import AdminWithdrawRequests from "./AdminWithdrawRequests";
import UserHistory from "./UserHistory";
import AdminUserHistory from "./AdminUserHistory";
import Match from "./components/Match";
import LudoBoard from "./components/LudoBoard";
import ForgotPassword from "./Forgotpassword";
import PaymentNumber from "./PaymentNumber";
import ReferralHistoryTable from "./components/ReferralHistoryTable";

function App() {
  const [token, setToken] = useState(null);
  const [mobile, setMobile] = useState("");
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [gameData, setGameData] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

  // Load token from localStorage and auto-navigate to dashboard if token exists
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      setToken(savedToken);
      if (location.pathname === "/" || location.pathname === "/login") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  // Load user profile
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user profile");
        return res.json();
      })
      .then((user) => {
        setMobile(user.mobile || "");
        setGameId(user.gameId || "");
        setRole(user.role || "");
        localStorage.setItem("userRole", user.role || "");
      })
      .catch((err) => {
        console.error(err);
        handleLogout();
      });
  }, [token, API_BASE_URL]);

  const handleLogin = (token) => {
    localStorage.setItem("authToken", token);
    setToken(token);
    navigate("/dashboard"); // নতুন default after login
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setMobile("");
    setGameId("");
    setRole(null);
    navigate("/"); // login page
  };

  const handleRegisterSuccess = () => setShowRegister(false);
  const isAdmin = (role || "").toLowerCase() === "admin";

  // Non-authenticated routes
  if (!token) {
    if (location.pathname === "/forgot-password") return <ForgotPassword />;
    return showRegister ? (
      <RegisterForm
        onRegisterSuccess={handleRegisterSuccess}
        goToLogin={() => setShowRegister(false)}
      />
    ) : (
      <LoginForm
        onLogin={handleLogin}
        onRegisterClick={() => setShowRegister(true)}
      />
    );
  }

  if (role === null) return <p style={{ padding: "20px" }}>লোড হচ্ছে...</p>;

  return (
    <Routes>
      {/* Dashboard/Home */}
      <Route
        path="/dashboard"
        element={
          <Home
            token={token}
            mobile={mobile}
            gameId={gameId}
            onLogout={handleLogout}
            onShowDeposit={() => navigate("/deposit")}
            onShowWithdraw={() => navigate("/withdraw")}
            onShowAdminDepositRequests={() => navigate("/admin-deposits")}
            onShowAdminWithdraw={() => navigate("/admin-withdraws")}
            onShowHistory={() => navigate("/history")}
            onShowAdminUserHistory={() => navigate("/admin-user-history")}
            onShowLudoMatch={() => navigate("/match")}
            onShowLudoBoard={() => navigate("/game")}
          />
        }
      />

      {/* Deposit & Withdraw */}
      <Route
        path="/deposit"
        element={<DepositForm token={token} onCancel={() => navigate("/dashboard")} />}
      />
      <Route
        path="/withdraw"
        element={<WithdrawForm token={token} onCancel={() => navigate("/dashboard")} />}
      />

      {/* Admin Deposit & Withdraw */}
      <Route
        path="/admin-deposits"
        element={isAdmin ? <AdminDepositRequests onCancel={() => navigate("/dashboard")} /> : <p>❌ অনুমতি নেই</p>}
      />
      <Route
        path="/admin-withdraws"
        element={isAdmin ? <AdminWithdrawRequests onCancel={() => navigate("/dashboard")} /> : <p>❌ অনুমতি নেই</p>}
      />

      {/* User & Admin History */}
      <Route
        path="/history"
        element={<UserHistory onCancel={() => navigate("/dashboard")} />}
      />
      <Route
        path="/admin-user-history"
        element={isAdmin ? <AdminUserHistory onCancel={() => navigate("/dashboard")} /> : <p>❌ অনুমতি নেই</p>}
      />

      {/* Referral History */}
      <Route path="/referrals" element={<ReferralHistoryTable />} />

      {/* Ludo Match & Board */}
      <Route
        path="/match"
        element={
          <Match
            userMobile={mobile}
            gameId={gameId}
            onGameStart={(gameInfo) => {
              setGameData(gameInfo);
              navigate("/game");
            }}
          />
        }
      />
      <Route
        path="/game"
        element={
          gameData || localStorage.getItem("gameId") ? (
            <LudoBoard
              userMobile={mobile}
              game={gameData || {
                id: localStorage.getItem("gameId"),
                playerId: localStorage.getItem("playerId"),
                entryFee: localStorage.getItem("entryFee"),
              }}
              onCancel={() => navigate("/dashboard")}
            />
          ) : (
            <p>❌ কোনো গেম পাওয়া যায়নি।</p>
          )
        }
      />

      {/* Forgot Password */}
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Admin Payment Number */}
      <Route
        path="/payment-number"
        element={isAdmin ? <PaymentNumber token={token} role={role} /> : <p style={{ padding: "20px", textAlign: "center" }}>❌ অনুমতি নেই (শুধু অ্যাডমিন)</p>}
      />

      {/* Default redirect */}
      <Route path="*" element={<p>❌ Page not found</p>} />
    </Routes>
  );
}

export default App;
