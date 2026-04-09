import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProgress } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import LearningPathMap from "../components/LearningPathMap.jsx";

function Stat({ label, value }) {
  return (
    <div className="surface-card-soft p-5">
      <div className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getProgress()
      .then((p) => mounted && setProgress(p))
      .catch((e) => mounted && setError(e?.response?.data?.detail || e?.message || "Failed to load progress"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const modules = progress?.learning_path || [];
  const currentIndex = progress?.current_module_index ?? 0;
  const completed = progress?.completed_modules || [];
  const doneCount = Array.isArray(completed) ? completed.length : 0;

  const completionPct = useMemo(() => {
    if (!modules.length) return 0;
    return Math.round((doneCount / modules.length) * 100);
  }, [modules.length, doneCount]);

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="section-kicker">Progress center</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {profile?.name ? `Hi ${profile.name},` : "Hi,"} here is your adaptive roadmap and latest learning status.
            </p>
          </div>
          <Link to="/session" className="btn-primary text-sm">
            Start session
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-white px-4 py-4">
          <div className="flex items-center justify-between text-sm font-semibold text-[var(--color-text-muted)]">
            <span>Overall completion</span>
            <span>{completionPct}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-600" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 surface-card-soft px-4 py-3 text-[var(--color-text-muted)]">Loading dashboard...</div>
      ) : error ? (
        <div className="mt-8 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 stagger">
            <Stat label="Modules completed" value={`${doneCount}/${modules.length || 0}`} />
            <Stat label="Current module" value={modules[currentIndex]?.topic || `#${currentIndex + 1}`} />
            <Stat label="Completion" value={`${completionPct}%`} />
          </div>

          <div className="mt-8 surface-card p-5 sm:p-6">
            <LearningPathMap learningPath={modules} currentIndex={currentIndex} completedModules={completed} />
          </div>
        </>
      )}
    </section>
  );
}

