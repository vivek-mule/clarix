import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { FiLogOut } from "react-icons/fi";

export default function Navbar() {
  const { isAuthenticated, logout, profile } = useAuth();
  const nav = useNavigate();

  const navClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

  const handleLogout = () => {
    logout();
    nav("/");
  };

  return (
    <header id="main-nav" className="sticky top-0 z-50">
      <nav className="nav-shell px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="inline-flex items-center gap-2 group">
            <span
              style={{
                display: "grid",
                height: "1.85rem",
                width: "1.85rem",
                placeItems: "center",
                borderRadius: "0.5rem",
                background: "var(--color-primary)",
                fontWeight: 800,
                fontSize: "0.8rem",
                color: "#fff",
              }}
            >
              C
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "var(--color-text)",
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              Clarix
            </span>
          </Link>

          {/* Center nav links */}
          {isAuthenticated && (
            <div className="hidden sm:flex flex-1 justify-center gap-1">
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              <NavLink to="/session" className={navClass}>Session</NavLink>
              <NavLink to="/onboarding" className={navClass}>Setup</NavLink>
            </div>
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="profile-chip">
                  <span className="status-dot" aria-hidden />
                  <span>{profile?.name || "Student"}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-ghost text-sm"
                  type="button"
                  style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem" }}
                >
                  <FiLogOut size={14} />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <Link to="/" className="btn-primary text-sm" style={{ fontSize: "0.8rem" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {isAuthenticated && (
          <div className="flex sm:hidden gap-1 mt-2 pb-0.5">
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/session" className={navClass}>Session</NavLink>
            <NavLink to="/onboarding" className={navClass}>Setup</NavLink>
          </div>
        )}
      </nav>
    </header>
  );
}
