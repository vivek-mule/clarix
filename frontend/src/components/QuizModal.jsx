import { useEffect, useMemo, useState } from "react";

export default function QuizModal({ open, questions = [], onSubmit, onClose, submitting = false }) {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (open) setAnswers({});
  }, [open, questions]);

  const normalized = useMemo(
    () =>
      (questions || []).map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
      })),
    [questions]
  );

  if (!open) return null;

  const submit = () => {
    const payload = normalized.map((q) => ({ id: q.id, answer: answers[q.id] ?? "" }));
    onSubmit?.(payload);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: "1.25rem",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4, 6, 14, 0.65)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "56rem",
          overflow: "hidden",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--color-border)",
          background: "linear-gradient(165deg, rgba(15, 22, 48, 0.95) 0%, rgba(10, 16, 35, 0.98) 100%)",
          boxShadow: "0 32px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 115, 160, 0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Top glow accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(123, 97, 255, 0.4), rgba(0, 212, 255, 0.3), transparent)",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            borderBottom: "1px solid var(--color-border)",
            background: "rgba(20, 28, 55, 0.4)",
            padding: "1.15rem 1.5rem",
          }}
        >
          <div>
            <div className="badge" style={{ background: "var(--color-secondary-glow)", border: "1px solid rgba(123, 97, 255, 0.2)", color: "var(--color-secondary)" }}>
              Knowledge check
            </div>
            <h3
              style={{
                marginTop: "0.35rem",
                fontSize: "1.25rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--color-text)",
              }}
            >
              Quiz
            </h3>
          </div>
          <button className="btn-secondary text-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Questions */}
        <div
          style={{
            maxHeight: "68vh",
            overflowY: "auto",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
            {normalized.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-soft)",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--color-text-dim)",
                  }}
                >
                  Question {idx + 1}
                </div>
                <div
                  style={{
                    marginTop: "0.4rem",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: "var(--color-text)",
                    lineHeight: 1.5,
                  }}
                >
                  {q.question}
                </div>

                {q.type === "mcq" && Array.isArray(q.options) ? (
                  <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <label
                          key={opt}
                          style={{
                            display: "flex",
                            cursor: "pointer",
                            alignItems: "center",
                            gap: "0.75rem",
                            borderRadius: "0.85rem",
                            border: isSelected
                              ? "1.5px solid rgba(0, 212, 255, 0.4)"
                              : "1px solid var(--color-border)",
                            background: isSelected
                              ? "var(--color-primary-glow)"
                              : "rgba(12, 18, 38, 0.4)",
                            padding: "0.8rem 1rem",
                            transition: "all 200ms ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = "rgba(99, 115, 160, 0.35)";
                              e.currentTarget.style.background = "rgba(20, 28, 55, 0.6)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = "var(--color-border)";
                              e.currentTarget.style.background = "rgba(12, 18, 38, 0.4)";
                            }
                          }}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                            style={{ accentColor: "var(--color-primary)" }}
                          />
                          <span style={{ fontSize: "0.88rem", color: "var(--color-text)" }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className="textarea-control"
                    style={{ marginTop: "1rem" }}
                    rows={4}
                    placeholder="Write your answer"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            background: "rgba(12, 18, 38, 0.5)",
            padding: "1rem 1.5rem",
          }}
        >
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full"
            style={{
              fontSize: "0.95rem",
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </button>
        </div>
      </div>
    </div>
  );
}
