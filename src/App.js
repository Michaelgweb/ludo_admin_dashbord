import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import Home from "./Home";
import AdminDepositRequests from "./AdminDepositRequests";
import AdminWithdrawRequests from "./AdminWithdrawRequests";
import AdminUserHistory from "./AdminUserHistory"; // old page: all users' transaction history
import AllUsers from "./UserHistory";              // NEW page: user list, stats, IP, device, user agent
import ForgotPassword from "./Forgotpassword";
import PaymentNumber from "./PaymentNumber";
import AdminApp from "./pages/AdminApp";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [mobile, setMobile] = useState("");
  const [gameId, setGameId] = useState("");
  const [role, setRole] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

  // Restore login session and redirect to dashboard
  useEffect(() => {
    if (token && (location.pathname === "/" || location.pathname === "/login")) {
      navigate("/dashboard", { replace: true });
    }
  }, [token, navigate, location.pathname]);

  // Logout
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

  // Load the authenticated user's profile
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
  const isStaff = role === "staff";
  const isAdminOrStaff = isAdmin || isStaff;

  // Public screens for unauthenticated users
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

  const noPermission = (text) => (
    <p style={{ padding: "20px", textAlign: "center" }}>{text}</p>
  );

  return (
    <Routes>
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <Home
            token={token}
            mobile={mobile}
            gameId={gameId}
            onLogout={handleLogout}
            onShowAdminDepositRequests={() => navigate("/admin-deposits")}
            onShowAdminWithdrawRequests={() => navigate("/admin-withdraws")}
            onShowAdminUserHistory={() => navigate("/admin-user-history")}
            onShowAdminApp={() => navigate("/admin-app")}
          />
        }
      />

      {/* ===== Admin only ===== */}
      <Route
        path="/admin-deposits"
        element={
          isAdmin ? (
            <AdminDepositRequests onCancel={() => navigate("/dashboard")} />
          ) : (
            noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন")
          )
        }
      />

      <Route
        path="/admin-withdraws"
        element={
          isAdmin ? (
            <AdminWithdrawRequests onCancel={() => navigate("/dashboard")} />
          ) : (
            noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন")
          )
        }
      />

      <Route
        path="/admin-user-history"
        element={
          isAdmin ? (
            <AdminUserHistory onCancel={() => navigate("/dashboard")} />
          ) : (
            noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন")
          )
        }
      />

      <Route
        path="/admin-app"
        element={
          isAdmin ? <AdminApp /> : noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন")
        }
      />

      <Route
        path="/payment-number"
        element={
          isAdmin ? (
            <PaymentNumber token={token} role={role} />
          ) : (
            noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন")
          )
        }
      />

      {/* ===== Admin + Staff: user list, stats, IP, device, user agent ===== */}
      <Route
        path="/admin-users"
        element={
          isAdminOrStaff ? (
            <AllUsers token={token} onBack={() => navigate("/dashboard")} />
          ) : (
            noPermission("❌ অনুমতি নেই — শুধু অ্যাডমিন ও স্টাফ")
          )
        }
      />

      <Route path="*" element={<p>❌ Page not found</p>} />
    </Routes>
  );
}

export default App;
