import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

export default function Layout() {
  return (
    <div className="app-shell">
      {/* Ambient glow effects */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div
          style={{
            position: "absolute",
            left: "-8rem",
            top: "-4rem",
            width: "28rem",
            height: "28rem",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 212, 255, 0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-6rem",
            top: "2rem",
            width: "32rem",
            height: "32rem",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123, 97, 255, 0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-2rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "36rem",
            height: "22rem",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 232, 157, 0.04) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
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
