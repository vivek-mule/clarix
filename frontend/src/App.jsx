import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LearningSession from "./pages/LearningSession.jsx";
import { useAuth } from "./hooks/useAuth.jsx";

function AuthLoadingScreen() {
  return (
    <section className="py-10">
      <div className="surface-card-soft px-4 py-3 text-sm text-[var(--color-text-muted)]">Checking session...</div>
    </section>
  );
}

function RequireAuth() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <AuthLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function PublicOnlyAuth() {
  const { isAuthenticated, initializing, profile } = useAuth();

  if (initializing) return <AuthLoadingScreen />;
  if (isAuthenticated) {
    const next = profile?.onboarding_complete ? "/dashboard" : "/onboarding";
    return <Navigate to={next} replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyAuth />}>
        <Route path="/auth" element={<Auth />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/session" element={<LearningSession />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
