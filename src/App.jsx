import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import AuthModal from "./components/AuthModal.jsx";
import HomePage from "./pages/HomePage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { api } from "./lib/api.js";
import { saveSession, clearSession, loadSession } from "./lib/session.js";

export default function App() {
  const initialSession = useMemo(loadSession, []);
  const [view, setView] = useState("home");
  const [token, setToken] = useState(initialSession.token);
  const [user, setUser] = useState(initialSession.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [notice, setNotice] = useState("");

  const isPremium = Boolean(user?.isPremium);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", { token })
      .then((session) => storeSession(session))
      .catch(() => {});
  }, [token]);

  const storeSession = (session) => {
    setToken(session.token);
    setUser(session.user);
    saveSession(session);
  };

  const openUnlock = () => {
    setView("payment");
  };

  return (
    <main className="min-h-screen overflow-hidden text-stone-50">
      <Header
        user={user}
        isPremium={isPremium}
        isAdmin={isAdmin}
        onAuth={() => setAuthOpen(true)}
        onHome={() => setView("home")}
        onPayment={() => setView("payment")}
        onDashboard={() => setView("dashboard")}
        onAdmin={() => setView("admin")}
        onLogout={() => {
          clearSession();
          setToken("");
          setUser(null);
          setView("home");
        }}
      />

      {view === "home" ? <HomePage token={token} isPremium={isPremium} onUnlock={openUnlock} /> : null}
      {view === "payment" ? (
        <PaymentPage user={user} notice={notice} onAuth={() => setAuthOpen(true)} />
      ) : null}
      {view === "dashboard" ? (
        <DashboardPage user={user} notice={notice} onPayment={() => setView("payment")} />
      ) : null}
      {view === "admin" ? <AdminPage token={token} isAdmin={isAdmin} /> : null}

      {authOpen ? (
        <AuthModal
          mode={authMode}
          onMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={(session) => {
            storeSession(session);
            setAuthOpen(false);
            setView("payment");
          }}
        />
      ) : null}
    </main>
  );
}
