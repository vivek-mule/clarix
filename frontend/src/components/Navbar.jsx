import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Navbar() {
  const { isAuthenticated, logout, profile } = useAuth();

  const navClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

  return (
    <header id="main-nav" className="sticky top-0 z-50 pb-1">
      <nav className="nav-shell px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-600 to-sky-700 font-extrabold text-white shadow-lg">
              P
            </span>
            <div>
              <div className="font-semibold leading-tight text-[var(--color-text)]">Pragyantra LearnOS</div>
              <div className="text-xs text-[var(--color-text-muted)]">Adaptive learning cockpit</div>
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
