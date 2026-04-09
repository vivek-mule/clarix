import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav id="main-nav" className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-surface)]/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          AdaptLearn
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-[var(--color-text-muted)]">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/chat" className="hover:text-white transition-colors">AI Tutor</Link>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  );
}
