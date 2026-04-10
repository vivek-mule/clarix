import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LearningSession from "./pages/LearningSession.jsx";
import { useAuth } from "./hooks/useAuth.jsx";

function AuthLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--color-bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: "1.5rem", height: "1.5rem", marginBottom: "0.75rem" }} />
        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Loading...</div>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <AuthLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(22, 22, 28, 0.95)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
          },
        }}
      />
      <Routes>
        {/* Public: Landing page with integrated auth */}
        <Route path="/" element={<Landing />} />

        {/* Protected routes within layout */}
        <Route element={<Layout />}>
          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/session" element={<LearningSession />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
