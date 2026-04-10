import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Navbar() {
  const { isAuthenticated, logout, profile } = useAuth();

  const navClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

  return (
    <header id="main-nav" className="sticky top-0 z-50 pb-1">
      <nav className="nav-shell px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <span
              style={{
                display: "grid",
                height: "2.2rem",
                width: "2.2rem",
                placeItems: "center",
                borderRadius: "0.7rem",
                background: "linear-gradient(135deg, var(--color-primary), #0090cc)",
                fontWeight: 800,
                fontSize: "0.9rem",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(0, 212, 255, 0.25)",
                transition: "transform 200ms ease, box-shadow 200ms ease",
              }}
            >
              P
            </span>
            <div>
              <div
                style={{
                  fontWeight: 650,
                  fontSize: "0.92rem",
                  lineHeight: 1.2,
                  color: "var(--color-text)",
                  letterSpacing: "-0.01em",
                }}
              >
                Pragyantra LearnOS
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--color-text-dim)",
                  letterSpacing: "0.02em",
                }}
              >
                Adaptive learning cockpit
              </div>
            </div>
          </Link>

          <div className="order-3 flex w-full flex-wrap gap-1 pt-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center sm:pt-0">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/session" className={navClass}>
              Session
            </NavLink>
            <NavLink to="/onboarding" className={navClass}>
              Setup
            </NavLink>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="profile-chip">
                  <span className="status-dot" aria-hidden />
                  <span>{profile?.name || "Student"}</span>
                </div>
                <button onClick={logout} className="btn-secondary text-sm" type="button">
                  Log out
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-primary text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
