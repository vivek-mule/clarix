import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth.jsx";
import { getAgentSessions, getQuizAttempts } from "../lib/api.js";

function Stat({ label, value, accentColor }) {
  return (
    <div
      className="surface-card-soft"
      style={{
        padding: "1.25rem 1.4rem",
        transition: "transform 200ms ease, border-color 200ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = `${accentColor || "var(--color-primary)"}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "0.35rem",
          fontSize: "1.65rem",
          fontWeight: 700,
          color: "var(--color-text)",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function pct(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "-";
  return `${Math.round(score * 100)}%`;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([getAgentSessions(), getQuizAttempts()])
      .then(([sessionRows, attemptRows]) => {
        if (!mounted) return;
        setSessions(Array.isArray(sessionRows) ? sessionRows : []);
        setAttempts(Array.isArray(attemptRows) ? attemptRows : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.detail || e?.message || "Failed to load history");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeSessions = useMemo(
    () => sessions.filter((s) => (s?.status || "").toLowerCase() === "active").length,
    [sessions]
  );

  const avgScore = useMemo(() => {
    if (!attempts.length) return "-";
    const total = attempts.reduce((acc, row) => acc + (typeof row?.score === "number" ? row.score : 0), 0);
    return pct(total / attempts.length);
  }, [attempts]);

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="section-kicker">Learning history</span>
            <h1
              style={{
                marginTop: "0.5rem",
                fontSize: "1.85rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              Dashboard
            </h1>
            <p style={{ marginTop: "0.5rem", color: "var(--color-text-muted)", fontSize: "0.92rem" }}>
              {profile?.name ? `Hi ${profile.name},` : "Hi,"} resume your past sessions and review quiz performance.
            </p>
          </div>
          <Link to="/session" className="btn-primary text-sm">
            New session
          </Link>
        </div>
      </div>

      {loading ? (
        <div
          className="mt-8 surface-card-soft"
          style={{
            padding: "1rem 1.25rem",
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "0.9rem",
              height: "0.9rem",
              borderRadius: "50%",
              border: "2px solid var(--color-primary)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Loading dashboard...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : null}

      {!loading && error ? (
        <div
          className="mt-8"
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(255, 77, 106, 0.25)",
            background: "var(--color-danger-soft)",
            padding: "0.85rem 1.15rem",
            fontSize: "0.88rem",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-4 stagger">
            <Stat label="Total sessions" value={`${sessions.length}`} accentColor="var(--color-primary)" />
            <Stat label="Active sessions" value={`${activeSessions}`} accentColor="var(--color-accent)" />
            <Stat label="Quiz attempts" value={`${attempts.length}`} accentColor="var(--color-secondary)" />
            <Stat label="Average quiz score" value={avgScore} accentColor="var(--color-warning)" />
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="surface-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--color-text)",
                  }}
                >
                  Saved sessions
                </h2>
                <span className="badge">{sessions.length}</span>
              </div>

              {!sessions.length ? (
                <div
                  className="mt-4"
                  style={{
                    borderRadius: "var(--radius-xl)",
                    border: "1px dashed var(--color-border-strong)",
                    background: "var(--color-surface-soft)",
                    padding: "1.5rem 1.15rem",
                    fontSize: "0.88rem",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                  }}
                >
                  No sessions yet. Start a new one and it will appear here.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.session_id}
                      style={{
                        borderRadius: "var(--radius-xl)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-soft)",
                        padding: "1rem 1.15rem",
                        transition: "border-color 200ms ease, background 200ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0, 212, 255, 0.2)";
                        e.currentTarget.style.background = "rgba(20, 28, 55, 0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border)";
                        e.currentTarget.style.background = "var(--color-surface-soft)";
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--color-text)" }}>
                            {s.title || "Untitled session"}
                          </div>
                          <div style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                            Last activity: {fmtDate(s.last_message_at || s.updated_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge">{s.status || "active"}</span>
                          <Link to={`/session?session_id=${encodeURIComponent(s.session_id)}`} className="btn-secondary text-xs">
                            Continue
                          </Link>
                        </div>
                      </div>

                      <div
                        className="mt-3 grid gap-2 sm:grid-cols-3"
                        style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}
                      >
                        <div>Module: {s.current_module?.topic || "-"}</div>
                        <div>Mastery: {pct(s.mastery_score)}</div>
                        <div>Messages: {s.message_count ?? 0}</div>
                      </div>

                      {s.last_user_message ? (
                        <div
                          style={{
                            marginTop: "0.6rem",
                            fontSize: "0.85rem",
                            color: "var(--color-text-dim)",
                            fontStyle: "italic",
                          }}
                        >
                          "{s.last_user_message}"
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="surface-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--color-text)",
                  }}
                >
                  Quiz history
                </h2>
                <span className="badge">{attempts.length}</span>
              </div>

              {!attempts.length ? (
                <div
                  className="mt-4"
                  style={{
                    borderRadius: "var(--radius-xl)",
                    border: "1px dashed var(--color-border-strong)",
                    background: "var(--color-surface-soft)",
                    padding: "1.5rem 1.15rem",
                    fontSize: "0.88rem",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                  }}
                >
                  No quiz attempts yet. Use "Ready for quiz" inside a session.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        borderRadius: "var(--radius-xl)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface-soft)",
                        padding: "0.9rem 1.1rem",
                        transition: "border-color 200ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(123, 97, 255, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border)";
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)" }}>
                          {a.module_topic || "Untitled topic"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.92rem",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {pct(a.score)}
                        </div>
                      </div>
                      <div style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                        Attempt #{a.attempt_number || 1} • {fmtDate(a.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
