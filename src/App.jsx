import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import AuthModal from "./components/AuthModal.jsx";
import HomePage from "./pages/HomePage.jsx";
import WatchPage from "./pages/WatchPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import { api } from "./lib/api.js";
import { saveSession, clearSession, loadSession } from "./lib/session.js";

export default function App() {
  const initialSession = useMemo(loadSession, []);
  const initialRoute = useMemo(getRouteFromLocation, []);
  const [view, setView] = useState(initialRoute.view);
  const [watchVideoId, setWatchVideoId] = useState(initialRoute.videoId);
  const [token, setToken] = useState(initialSession.token);
  const [user, setUser] = useState(initialSession.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [notice, setNotice] = useState("");
  const [restoreHomeScroll, setRestoreHomeScroll] = useState(false);
  const homeScrollRef = useRef(Number(sessionStorage.getItem("teamusa_home_scroll") || 0));

  const isPremium = Boolean(user?.isPremium);
  const isAdmin = user?.role === "admin";
  const isPartner = user?.role === "partner";
  const isContentManager = isAdmin || isPartner;

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", { token })
      .then((session) => storeSession(session))
      .catch((error) => {
        if (error.status === 401 || error.status === 403) {
          clearSession();
          setToken("");
          setUser(null);
          navigateHome();
          setAuthMode("signin");
          setAuthOpen(true);
        }
      });
  }, [token]);

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromLocation();
      setView(route.view);
      setWatchVideoId(route.videoId);
      setRestoreHomeScroll(route.view === "home");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (view !== "home" || !restoreHomeScroll) return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: homeScrollRef.current || 0, behavior: "instant" });
      setRestoreHomeScroll(false);
    });
  }, [restoreHomeScroll, view]);

  const storeSession = (session) => {
    setToken(session.token);
    setUser(session.user);
    saveSession(session);
  };

  const openUnlock = () => {
    navigateView("payment", "/payment");
  };

  const navigateView = (nextView, path = "/") => {
    setView(nextView);
    setWatchVideoId("");
    window.history.pushState({}, "", path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateHome = (restoreScroll = false) => {
    setView("home");
    setWatchVideoId("");
    setRestoreHomeScroll(Boolean(restoreScroll));
    window.history.pushState({}, "", "/");
    if (!restoreScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWatch = (videoId) => {
    if (view === "home") {
      homeScrollRef.current = window.scrollY;
      sessionStorage.setItem("teamusa_home_scroll", String(homeScrollRef.current));
    }
    setWatchVideoId(videoId);
    setView("watch");
    window.history.pushState({ videoId }, "", `/watch/${encodeURIComponent(videoId)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeWatch = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigateHome(true);
  };

  return (
    <main className="min-h-screen overflow-hidden text-stone-50">
      {view !== "watch" ? (
        <Header
          user={user}
          isPremium={isPremium}
          isAdmin={isAdmin}
          isPartner={isPartner}
          isContentManager={isContentManager}
          onAuth={() => setAuthOpen(true)}
          onHome={() => navigateHome(false)}
          onPayment={() => navigateView("payment", "/payment")}
          onDashboard={() => navigateView(isPartner ? "admin" : "dashboard", isPartner ? "/admin" : "/dashboard")}
          onAdmin={() => navigateView("admin", "/admin")}
          onLogout={() => {
            clearSession();
            setToken("");
            setUser(null);
            navigateHome(false);
          }}
        />
      ) : null}

      {view === "home" ? (
        <HomePage token={token} isPremium={isPremium} onUnlock={openUnlock} onWatch={openWatch} />
      ) : null}
      {view === "watch" ? (
        <WatchPage
          videoId={watchVideoId}
          token={token}
          isPremium={isPremium}
          onUnlock={openUnlock}
          onBack={closeWatch}
          onWatch={openWatch}
        />
      ) : null}
      {view === "payment" ? (
        <PaymentPage user={user} notice={notice} onAuth={() => setAuthOpen(true)} />
      ) : null}
      {view === "dashboard" ? (
        <DashboardPage user={user} notice={notice} onPayment={() => setView("payment")} />
      ) : null}
      {view === "admin" ? <AdminPage token={token} user={user} isAdmin={isAdmin} isPartner={isPartner} /> : null}

      {authOpen ? (
        <AuthModal
          mode={authMode}
          onMode={setAuthMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={(session) => {
            storeSession(session);
            setAuthOpen(false);
            navigateView(["admin", "partner"].includes(session.user?.role) ? "admin" : "payment", ["admin", "partner"].includes(session.user?.role) ? "/admin" : "/payment");
          }}
        />
      ) : null}
    </main>
  );
}

function getRouteFromLocation() {
  const path = window.location.pathname;
  const watchMatch = path.match(/^\/watch\/([^/]+)/);
  if (watchMatch) {
    return { view: "watch", videoId: decodeURIComponent(watchMatch[1]) };
  }
  if (path === "/payment") return { view: "payment", videoId: "" };
  if (path === "/dashboard") return { view: "dashboard", videoId: "" };
  if (path === "/admin") return { view: "admin", videoId: "" };
  return { view: "home", videoId: "" };
}
