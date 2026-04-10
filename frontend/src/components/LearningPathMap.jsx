import { Link } from "react-router-dom";

function statusForModule({ idx, currentIndex, completed, topic }) {
  if (completed?.includes(idx) || completed?.includes(topic)) return "completed";
  if (idx < currentIndex) return "completed";
  if (idx === currentIndex) return "current";
  return "locked";
}

const statusStyles = {
  completed: {
    chipBg: "var(--color-accent-glow)",
    chipBorder: "rgba(0, 232, 157, 0.25)",
    chipColor: "var(--color-accent)",
    cardBorder: "rgba(0, 232, 157, 0.2)",
    cardBg: "linear-gradient(135deg, rgba(0, 232, 157, 0.06), rgba(0, 232, 157, 0.02))",
    numBg: "linear-gradient(135deg, var(--color-accent), #00c482)",
    numShadow: "0 2px 10px rgba(0, 232, 157, 0.25)",
  },
  current: {
    chipBg: "var(--color-primary-glow)",
    chipBorder: "rgba(0, 212, 255, 0.25)",
    chipColor: "var(--color-primary)",
    cardBorder: "rgba(0, 212, 255, 0.25)",
    cardBg: "linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(0, 212, 255, 0.02))",
    numBg: "linear-gradient(135deg, var(--color-primary), #0090cc)",
    numShadow: "0 2px 10px rgba(0, 212, 255, 0.25)",
  },
  locked: {
    chipBg: "var(--color-surface-soft)",
    chipBorder: "var(--color-border)",
    chipColor: "var(--color-text-dim)",
    cardBorder: "var(--color-border)",
    cardBg: "var(--color-surface-soft)",
    numBg: "rgba(20, 28, 55, 0.6)",
    numShadow: "none",
  },
};

function Chip({ status }) {
  const s = statusStyles[status];
  const label = status === "completed" ? "Completed" : status === "current" ? "Current" : "Locked";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        border: `1px solid ${s.chipBorder}`,
        padding: "0.28rem 0.7rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        color: s.chipColor,
        background: s.chipBg,
        letterSpacing: "0.02em",
      }}
    >
      {status === "completed" && "✓ "}
      {label}
    </span>
  );
}

export default function LearningPathMap({ learningPath = [], currentIndex = 0, completedModules = [] }) {
  const completed = Array.isArray(completedModules) ? completedModules : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--color-text)",
          }}
        >
          Your roadmap
        </h3>
        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{learningPath.length} modules</div>
      </div>

      <div className="mt-6 space-y-4">
        {learningPath.length === 0 ? (
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px dashed var(--color-border-strong)",
              background: "var(--color-surface-soft)",
              padding: "1.25rem 1.15rem",
              fontSize: "0.88rem",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
          >
            No learning path yet. Start a learning session and the agent will generate one.
          </div>
        ) : (
          learningPath.map((m, idx) => {
            const topic = m?.topic || `Module ${idx + 1}`;
            const status = statusForModule({ idx, currentIndex, completed, topic });
            const isLocked = status === "locked";
            const difficulty = m?.difficulty || "";
            const objective = Array.isArray(m?.learning_objectives) ? m.learning_objectives[0] : "";
            const s = statusStyles[status];

            return (
              <div
                key={`${topic}-${idx}`}
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-xl)",
                  border: `1px solid ${s.cardBorder}`,
                  background: s.cardBg,
                  padding: "1.25rem",
                  transition: "transform 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Connector line */}
                {idx < learningPath.length - 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-1.35rem",
                      left: "2rem",
                      height: "1.35rem",
                      width: "2px",
                      background: "linear-gradient(to bottom, var(--color-border-strong), transparent)",
                    }}
                    aria-hidden
                  />
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                    <div
                      style={{
                        marginTop: "0.15rem",
                        display: "grid",
                        height: "2rem",
                        width: "2rem",
                        placeItems: "center",
                        borderRadius: "0.55rem",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        background: s.numBg,
                        color: isLocked ? "var(--color-text-dim)" : "#fff",
                        boxShadow: s.numShadow,
                      }}
                    >
                      {status === "completed" ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-dim)" }}>
                        Module {idx + 1}
                      </div>
                      <div
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {topic}
                      </div>
                      {difficulty ? (
                        <div style={{ marginTop: "0.3rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                          Difficulty: {difficulty}
                        </div>
                      ) : null}
                      {objective ? (
                        <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                          Focus: {objective}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <Chip status={status} />
                    <Link
                      to="/session"
                      style={{
                        borderRadius: "0.75rem",
                        padding: "0.5rem 1rem",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        transition: "all 200ms ease",
                        textDecoration: "none",
                        ...(isLocked
                          ? {
                              pointerEvents: "none",
                              border: "1px solid var(--color-border)",
                              background: "var(--color-surface-soft)",
                              color: "var(--color-text-dim)",
                              opacity: 0.5,
                            }
                          : {
                              background: "linear-gradient(135deg, var(--color-primary), #0090cc)",
                              color: "#fff",
                              border: "1px solid rgba(0, 212, 255, 0.3)",
                              boxShadow: "0 3px 12px rgba(0, 212, 255, 0.2)",
                            }),
                      }}
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
