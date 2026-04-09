import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

export default function Layout() {
  return (
    <div className="app-shell">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[34rem] -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />
      </div>
      <Navbar />
      <main className="page-main">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
