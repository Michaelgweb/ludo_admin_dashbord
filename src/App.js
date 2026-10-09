
import React, { useState, useEffect, useCallback } from "react";
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
import ForgotPassword from "./Forgotpassword";
import PaymentNumber from "./PaymentNumber";
import ReferralHistoryTable from "./components/ReferralHistoryTable";

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken")
  );
  const [mobile, setMobile] = useState("");
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

  // Restore login session and redirect to dashboard.
  useEffect(() => {
    if (
      token &&
      (location.pathname === "/" || location.pathname === "/login")
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate, location.pathname]);

  // Logout.
  const handleLogout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");

    setToken(null);
    setMobile("");
    setGameId("");
    setRole(null);
    setShowRegister(false);

    navigate("/", { replace: true });
  }, [navigate]);

  // Load authenticated user's profile.
  useEffect(() => {
    if (!token) {
      setRole(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const user = await res.json();

        if (cancelled) return;

        const userRole = (user.role || "").toLowerCase();

        setMobile(user.mobile || "");
        setGameId(user.gameId || "");
        setRole(userRole);
        localStorage.setItem("userRole", userRole);
      } catch (err) {
        if (cancelled) return;

        console.error("Error loading user profile:", err);
        handleLogout();
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token, API_BASE_URL, handleLogout]);

  const handleLogin = (newToken) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setRole(null);
    navigate("/dashboard", { replace: true });
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  const isAdmin = role === "admin";

  // Public routes for unauthenticated users.
  if (!token) {
    if (location.pathname === "/forgot-password") {
      return <ForgotPassword />;
    }

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

  if (role === null) {
    return <p style={{ padding: "20px" }}>লোড হচ্ছে...</p>;
  }

  return (
    <Routes>
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
            onShowAdminDepositRequests={() =>
              navigate("/admin-deposits")
            }
            onShowAdminWithdrawRequests={() =>
              navigate("/admin-withdraws")
            }
            onShowHistory={() => navigate("/history")}
            onShowAdminUserHistory={() =>
              navigate("/admin-user-history")
            }
          />
        }
      />

      <Route
        path="/deposit"
        element={
          <DepositForm
            token={token}
            onCancel={() => navigate("/dashboard")}
          />
        }
      />

      <Route
        path="/withdraw"
        element={
          <WithdrawForm
            token={token}
            onCancel={() => navigate("/dashboard")}
          />
        }
      />

      <Route
        path="/history"
        element={
          <UserHistory
            onCancel={() => navigate("/dashboard")}
          />
        }
      />

      <Route
        path="/admin-deposits"
        element={
          isAdmin ? (
            <AdminDepositRequests
              onCancel={() => navigate("/dashboard")}
            />
          ) : (
            <p>❌ অনুমতি নেই — শুধু অ্যাডমিন</p>
          )
        }
      />

      <Route
        path="/admin-withdraws"
        element={
          isAdmin ? (
            <AdminWithdrawRequests
              onCancel={() => navigate("/dashboard")}
            />
          ) : (
            <p>❌ অনুমতি নেই — শুধু অ্যাডমিন</p>
          )
        }
      />

      <Route
        path="/admin-user-history"
        element={
          isAdmin ? (
            <AdminUserHistory
              onCancel={() => navigate("/dashboard")}
            />
          ) : (
            <p>❌ অনুমতি নেই — শুধু অ্যাডমিন</p>
          )
        }
      />

      <Route
        path="/referrals"
        element={
          <ReferralHistoryTable />
        }
      />

      <Route
        path="/payment-number"
        element={
          isAdmin ? (
            <PaymentNumber token={token} role={role} />
          ) : (
            <p
              style={{
                padding: "20px",
                textAlign: "center",
              }}
            >
              ❌ অনুমতি নেই — শুধু অ্যাডমিন
            </p>
          )
        }
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="*"
        element={<p>❌ Page not found</p>}
      />
    </Routes>
  );
}

export default App;
