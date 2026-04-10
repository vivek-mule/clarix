import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth.jsx";
import { getAgentSessions, getQuizAttempts } from "../lib/api.js";

function Stat({ label, value }) {
  return (
    <div className="surface-card-soft p-5">
      <div className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--color-text)]">{value}</div>
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
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {profile?.name ? `Hi ${profile.name},` : "Hi,"} resume your past sessions and review quiz performance.
            </p>
          </div>
          <Link to="/session" className="btn-primary text-sm">
            New session
          </Link>
        </div>
      </div>

      {loading ? <div className="mt-8 surface-card-soft px-4 py-3 text-[var(--color-text-muted)]">Loading dashboard...</div> : null}
      {!loading && error ? <div className="mt-8 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-4 stagger">
            <Stat label="Total sessions" value={`${sessions.length}`} />
            <Stat label="Active sessions" value={`${activeSessions}`} />
            <Stat label="Quiz attempts" value={`${attempts.length}`} />
            <Stat label="Average quiz score" value={avgScore} />
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="surface-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight">Saved sessions</h2>
                <span className="badge">{sessions.length}</span>
              </div>

              {!sessions.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-6 text-sm text-[var(--color-text-muted)]">
                  No sessions yet. Start a new one and it will appear here.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {sessions.map((s) => (
                    <div key={s.session_id} className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--color-text)]">{s.title || "Untitled session"}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-muted)]">Last activity: {fmtDate(s.last_message_at || s.updated_at)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge">{s.status || "active"}</span>
                          <Link to={`/session?session_id=${encodeURIComponent(s.session_id)}`} className="btn-secondary text-xs">
                            Continue
                          </Link>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-[var(--color-text-muted)]">
                        <div>Module: {s.current_module?.topic || "-"}</div>
                        <div>Mastery: {pct(s.mastery_score)}</div>
                        <div>Messages: {s.message_count ?? 0}</div>
                      </div>

                      {s.last_user_message ? <div className="mt-2 text-sm text-[var(--color-text-muted)]">"{s.last_user_message}"</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="surface-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight">Quiz history</h2>
                <span className="badge">{attempts.length}</span>
              </div>

              {!attempts.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] px-4 py-6 text-sm text-[var(--color-text-muted)]">
                  No quiz attempts yet. Use "Ready for quiz" inside a session.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {attempts.map((a) => (
                    <div key={a.id} className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-[var(--color-text)]">{a.module_topic || "Untitled topic"}</div>
                        <div className="text-sm font-bold text-[var(--color-text)]">{pct(a.score)}</div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-text-muted)]">
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

