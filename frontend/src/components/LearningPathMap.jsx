import { Link } from "react-router-dom";

function statusForModule({ idx, currentIndex, completed, topic }) {
  if (completed?.includes(idx) || completed?.includes(topic)) return "completed";
  if (idx < currentIndex) return "completed";
  if (idx === currentIndex) return "current";
  return "locked";
}

function Chip({ status }) {
  const cls =
    status === "completed"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : status === "current"
      ? "bg-cyan-100 text-cyan-800 border-cyan-300"
      : "bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] border-[var(--color-border)]";
  const label = status === "completed" ? "Completed" : status === "current" ? "Current" : "Locked";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default function LearningPathMap({ learningPath = [], currentIndex = 0, completedModules = [] }) {
  const completed = Array.isArray(completedModules) ? completedModules : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Your roadmap</h3>
        <div className="text-sm text-[var(--color-text-muted)]">{learningPath.length} modules</div>
      </div>

      <div className="mt-6 space-y-4">
        {learningPath.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text-muted)]">
            No learning path yet. Start a learning session and the agent will generate one.
          </div>
        ) : (
          learningPath.map((m, idx) => {
            const topic = m?.topic || `Module ${idx + 1}`;
            const status = statusForModule({ idx, currentIndex, completed, topic });
            const isLocked = status === "locked";
            const difficulty = m?.difficulty || "";
            const objective = Array.isArray(m?.learning_objectives) ? m.learning_objectives[0] : "";

            return (
              <div
                key={`${topic}-${idx}`}
                className={`relative rounded-2xl border p-5 ${
                  status === "current"
                    ? "border-cyan-400 bg-cyan-50"
                    : status === "completed"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-[var(--color-border)] bg-white"
                }`}
              >
                {idx < learningPath.length - 1 ? (
                  <div className="absolute bottom-[-22px] left-9 h-6 w-px bg-[var(--color-border)]" aria-hidden />
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                        status === "completed"
                          ? "bg-emerald-600 text-white"
                          : status === "current"
                          ? "bg-cyan-700 text-white"
                          : "bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text-muted)]">Module {idx + 1}</div>
                      <div className="text-lg font-semibold text-[var(--color-text)]">{topic}</div>
                      {difficulty ? (
                        <div className="mt-1 text-sm text-[var(--color-text-muted)]">Difficulty: {difficulty}</div>
                      ) : null}
                      {objective ? <div className="mt-2 text-sm text-[var(--color-text-muted)]">Focus: {objective}</div> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Chip status={status} />
                    <Link
                      to="/session"
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                        isLocked
                          ? "pointer-events-none border border-[var(--color-border)] bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] opacity-60"
                          : "bg-gradient-to-r from-cyan-600 to-sky-700 text-white shadow"
                      }`}
                    >
                      Open module
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

