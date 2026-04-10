import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiMessageSquare,
  FiActivity,
  FiAward,
  FiTrendingUp,
  FiPlus,
  FiClock,
  FiChevronRight,
  FiBookOpen,
  FiZap,
  FiTarget,
  FiArrowUpRight,
  FiLayers,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth.jsx";
import { getAgentSessions, getQuizAttempts } from "../lib/api.js";

/* ── Animation Variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

/* ── Small Helpers ── */
function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function pct(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "-";
  return `${Math.round(score * 100)}%`;
}

function statusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return { bg: "var(--color-accent-glow)", border: "rgba(16,185,129,0.2)", color: "var(--color-accent)" };
  if (s === "error") return { bg: "var(--color-danger-soft)", border: "rgba(239,68,68,0.2)", color: "var(--color-danger)" };
  return { bg: "var(--color-primary-glow)", border: "rgba(99,102,241,0.2)", color: "var(--color-primary-light)" };
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, accent, index }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      style={{
        position: "relative",
        padding: "1.25rem 1.3rem",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border)",
        background: "rgba(14, 14, 18, 0.75)",
        backdropFilter: "blur(8px)",
        overflow: "hidden",
        cursor: "default",
        transition: "border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accent}40`;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 10px 32px ${accent}12`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "6rem",
          height: "6rem",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}08, transparent 70%)`,
          transform: "translate(30%, -30%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "0.65rem",
            display: "grid",
            placeItems: "center",
            background: `${accent}12`,
            color: accent,
            flexShrink: 0,
          }}
        >
          <Icon size={19} />
        </div>
        <div>
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--color-text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "1.55rem",
              fontWeight: 800,
              color: "var(--color-text)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginTop: "0.1rem",
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════ DASHBOARD ════════════════════ */
export default function Dashboard() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([getAgentSessions(), getQuizAttempts()])
      .then(([s, a]) => {
        if (!mounted) return;
        setSessions(Array.isArray(s) ? s : []);
        setAttempts(Array.isArray(a) ? a : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.detail || e?.message || "Failed to load data");
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const activeSessions = useMemo(() => sessions.filter((s) => (s?.status || "").toLowerCase() === "active").length, [sessions]);
  
  const completedSessions = useMemo(() => sessions.filter((s) => (s?.status || "").toLowerCase() === "completed").length, [sessions]);

  const avgScore = useMemo(() => {
    if (!attempts.length) return "-";
    const t = attempts.reduce((a, r) => a + (typeof r?.score === "number" ? r.score : 0), 0);
    return pct(t / attempts.length);
  }, [attempts]);

  const bestScore = useMemo(() => {
    if (!attempts.length) return "-";
    return pct(Math.max(...attempts.map((a) => (typeof a?.score === "number" ? a.score : 0))));
  }, [attempts]);

  const greeting = profile?.name ? profile.name.split(" ")[0] : "Student";

  return (
    <section style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
      {/* ── Welcome Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--color-border)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 50%, rgba(6,182,212,0.04) 100%)",
          padding: "2rem 2rem 1.75rem",
          overflow: "hidden",
          marginBottom: "1.5rem",
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: "-3rem", right: "-2rem", width: "14rem", height: "14rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent 65%)", filter: "blur(30px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-4rem", left: "20%", width: "12rem", height: "12rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.04), transparent 60%)", filter: "blur(30px)", pointerEvents: "none" }} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--color-primary-light)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.6rem" }}
            >
              <FiZap size={12} /> Dashboard
            </motion.div>
            <h1
              style={{
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
                lineHeight: 1.15,
              }}
            >
              Welcome back, <span className="gradient-text">{greeting}</span>
            </h1>
            <p style={{ marginTop: "0.4rem", color: "var(--color-text-muted)", fontSize: "0.88rem", maxWidth: "32rem" }}>
              Track your progress, continue your sessions, and keep building mastery.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              onClick={() => nav("/session")}
              className="btn-primary"
              style={{ gap: "0.35rem", fontSize: "0.85rem" }}
            >
              <FiPlus size={15} /> New Session
            </button>
            <button
              onClick={() => nav("/onboarding")}
              className="btn-secondary"
              style={{ gap: "0.35rem", fontSize: "0.85rem" }}
            >
              <FiLayers size={14} /> Setup
            </button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border)",
            background: "rgba(14,14,18,0.6)",
            padding: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.65rem",
            fontSize: "0.88rem",
            color: "var(--color-text-muted)",
          }}
        >
          <span className="spinner" /> Loading your dashboard...
        </motion.div>
      ) : error ? (
        <div
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(239,68,68,0.2)",
            background: "var(--color-danger-soft)",
            padding: "1rem 1.25rem",
            fontSize: "0.85rem",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </div>
      ) : (
        <>
          {/* ── Stats Grid ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <StatCard icon={FiMessageSquare} label="Total Sessions" value={`${sessions.length}`} accent="#6366f1" index={0} />
            <StatCard icon={FiActivity} label="Active Now" value={`${activeSessions}`} accent="#10b981" index={1} />
            <StatCard icon={FiAward} label="Quizzes Taken" value={`${attempts.length}`} accent="#a855f7" index={2} />
            <StatCard icon={FiTrendingUp} label="Avg Score" value={avgScore} accent="#f59e0b" index={3} />
          </motion.div>

          {/* ── Quick Actions Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.6rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              { icon: FiTarget, label: "Take a Quiz", desc: "Test your knowledge", onClick: () => nav("/session"), accent: "#a855f7" },
              { icon: FiBookOpen, label: "Continue Learning", desc: `${activeSessions} active session${activeSessions !== 1 ? "s" : ""}`, onClick: () => { if (sessions[0]) nav(`/session?session_id=${sessions[0].session_id}`); else nav("/session"); }, accent: "#6366f1" },
              { icon: FiTrendingUp, label: "Best Score", desc: bestScore, onClick: null, accent: "#10b981" },
            ].map((action, i) => (
              <div
                key={action.label}
                onClick={action.onClick || undefined}
                style={{
                  padding: "1rem 1.1rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  background: "rgba(14,14,18,0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  cursor: action.onClick ? "pointer" : "default",
                  transition: "all 180ms ease",
                }}
                onMouseEnter={(e) => {
                  if (action.onClick) {
                    e.currentTarget.style.borderColor = `${action.accent}35`;
                    e.currentTarget.style.background = "rgba(22,22,28,0.7)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.background = "rgba(14,14,18,0.6)";
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "0.5rem",
                    display: "grid",
                    placeItems: "center",
                    background: `${action.accent}10`,
                    color: action.accent,
                    flexShrink: 0,
                  }}
                >
                  <action.icon size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text)" }}>{action.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-dim)" }}>{action.desc}</div>
                </div>
                {action.onClick && <FiArrowUpRight size={14} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />}
              </div>
            ))}
          </motion.div>

          {/* ── Main Content ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
              gap: "1rem",
            }}
          >
            {/* Sessions Panel */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                background: "rgba(14,14,18,0.75)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  padding: "1rem 1.2rem",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(18,18,24,0.4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.4rem", display: "grid", placeItems: "center", background: "var(--color-primary-glow)", color: "var(--color-primary-light)" }}>
                    <FiBookOpen size={13} />
                  </div>
                  <h2 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text)" }}>
                    Learning Sessions
                  </h2>
                </div>
                <span className="badge">{sessions.length}</span>
              </div>

              {/* Session list */}
              <div style={{ flex: 1, padding: "0.6rem", overflowY: "auto", maxHeight: "28rem" }}>
                {!sessions.length ? (
                  <div
                    style={{
                      margin: "1rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px dashed var(--color-border-strong)",
                      background: "rgba(22,22,28,0.4)",
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.6rem", display: "grid", placeItems: "center", background: "var(--color-primary-glow)", margin: "0 auto 0.65rem" }}>
                      <FiMessageSquare size={18} style={{ color: "var(--color-primary-light)" }} />
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)", marginBottom: "0.25rem" }}>No sessions yet</div>
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", maxWidth: "18rem", margin: "0 auto 0.85rem" }}>
                      Start your first learning session to begin your adaptive educational journey.
                    </p>
                    <button onClick={() => nav("/session")} className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.45rem 1rem" }}>
                      <FiPlus size={13} /> Start Learning
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {sessions.map((s) => {
                      const sc = statusColor(s.status);
                      return (
                        <div
                          key={s.session_id}
                          onClick={() => nav(`/session?session_id=${encodeURIComponent(s.session_id)}`)}
                          style={{
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            background: "rgba(18,18,24,0.45)",
                            padding: "0.85rem 1rem",
                            cursor: "pointer",
                            transition: "all 180ms ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(28,28,36,0.55)";
                            e.currentTarget.style.borderColor = "var(--color-border-strong)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(18,18,24,0.45)";
                            e.currentTarget.style.borderColor = "var(--color-border)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {s.title || "Untitled session"}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.3rem", fontSize: "0.7rem", color: "var(--color-text-dim)" }}>
                                <FiClock size={10} />
                                <span>{fmtDate(s.last_message_at || s.updated_at)}</span>
                                {s.current_module?.topic && (
                                  <>
                                    <span style={{ opacity: 0.4 }}>·</span>
                                    <span style={{ color: "var(--color-text-muted)" }}>{s.current_module.topic}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  borderRadius: "999px",
                                  padding: "0.2rem 0.55rem",
                                  fontSize: "0.65rem",
                                  fontWeight: 600,
                                  border: `1px solid ${sc.border}`,
                                  background: sc.bg,
                                  color: sc.color,
                                }}
                              >
                                {s.status || "active"}
                              </span>
                              <FiChevronRight size={14} style={{ color: "var(--color-text-dim)" }} />
                            </div>
                          </div>
                          {/* Mastery bar */}
                          {typeof s.mastery_score === "number" && s.mastery_score >= 0 && (
                            <div style={{ marginTop: "0.55rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--color-text-dim)", marginBottom: "0.25rem" }}>
                                <span>Mastery</span>
                                <span style={{ fontWeight: 600, color: s.mastery_score >= 0.75 ? "var(--color-accent)" : "var(--color-primary-light)" }}>{pct(s.mastery_score)}</span>
                              </div>
                              <div style={{ height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: "999px",
                                    width: `${Math.round(s.mastery_score * 100)}%`,
                                    background: s.mastery_score >= 0.75
                                      ? "linear-gradient(90deg, var(--color-accent), #34d399)"
                                      : "linear-gradient(90deg, var(--color-primary), var(--color-primary-light))",
                                    transition: "width 500ms ease",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quiz History Panel */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              style={{
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--color-border)",
                background: "rgba(14,14,18,0.75)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  padding: "1rem 1.2rem",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(18,18,24,0.4)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.4rem", display: "grid", placeItems: "center", background: "var(--color-secondary-glow)", color: "var(--color-secondary)" }}>
                    <FiAward size={13} />
                  </div>
                  <h2 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text)" }}>Quiz Results</h2>
                </div>
                <span className="badge badge-secondary">{attempts.length}</span>
              </div>

              {/* Quiz list */}
              <div style={{ flex: 1, padding: "0.6rem", overflowY: "auto", maxHeight: "28rem" }}>
                {!attempts.length ? (
                  <div
                    style={{
                      margin: "1rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px dashed var(--color-border-strong)",
                      background: "rgba(22,22,28,0.4)",
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.6rem", display: "grid", placeItems: "center", background: "var(--color-secondary-glow)", margin: "0 auto 0.65rem" }}>
                      <FiAward size={18} style={{ color: "var(--color-secondary)" }} />
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)", marginBottom: "0.25rem" }}>No quizzes yet</div>
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", maxWidth: "16rem", margin: "0 auto" }}>
                      Complete a learning module and take a quiz to see your results here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {attempts.map((a) => {
                      const score = typeof a?.score === "number" ? a.score : 0;
                      const scoreColor = score >= 0.75 ? "var(--color-accent)" : score >= 0.5 ? "var(--color-warning)" : "var(--color-danger)";
                      return (
                        <div
                          key={a.id}
                          style={{
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            background: "rgba(18,18,24,0.45)",
                            padding: "0.85rem 1rem",
                            transition: "border-color 150ms ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {a.module_topic || "Untitled"}
                              </div>
                              <div style={{ marginTop: "0.2rem", fontSize: "0.68rem", color: "var(--color-text-dim)" }}>
                                Attempt #{a.attempt_number || 1} · {fmtDate(a.created_at)}
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-display)", color: scoreColor }}>
                                {pct(a.score)}
                              </div>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div style={{ marginTop: "0.45rem", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                borderRadius: "999px",
                                width: `${Math.round(score * 100)}%`,
                                background: scoreColor,
                                transition: "width 500ms ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Tip Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1.15rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid rgba(99,102,241,0.1)",
              background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.03))",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
            }}
          >
            <div style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.4rem", display: "grid", placeItems: "center", background: "var(--color-primary-glow)", color: "var(--color-primary-light)", flexShrink: 0 }}>
              <FiZap size={12} />
            </div>
            <span>
              <strong style={{ color: "var(--color-text)" }}>Pro tip:</strong> Start a session and ask about any topic. Clarix will diagnose your level, build a curriculum, and deliver adaptive lessons grounded in your course materials.
            </span>
          </motion.div>
        </>
      )}
    </section>
  );
}
