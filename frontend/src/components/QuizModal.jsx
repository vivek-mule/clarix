import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCheck, FiSend, FiAward } from "react-icons/fi";

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

  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;
  const totalCount = normalized.length;
  const progressPct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  if (!open) return null;

  const submit = () => {
    const payload = normalized.map((q) => ({ id: q.id, answer: answers[q.id] ?? "" }));
    onSubmit?.(payload);
  };

  return (
    <AnimatePresence>
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: "1rem" }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(10px)" }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "44rem",
            borderRadius: "var(--radius-2xl)",
            border: "1px solid var(--color-border)",
            background: "rgba(14, 14, 18, 0.97)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 60px rgba(99,102,241,0.05)",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          {/* Top accent */}
          <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, var(--color-secondary), var(--color-primary), transparent)" }} />

          {/* Header */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)", background: "linear-gradient(180deg, rgba(168,85,247,0.03), transparent)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ width: "2.4rem", height: "2.4rem", borderRadius: "0.6rem", display: "grid", placeItems: "center", background: "var(--color-secondary-glow)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <FiAward size={17} style={{ color: "var(--color-secondary)" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                    Knowledge Check
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.1rem" }}>
                    {totalCount} question{totalCount !== 1 ? "s" : ""} · {answeredCount} answered
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.4rem",
                  cursor: "pointer",
                  color: "var(--color-text-dim)",
                  display: "flex",
                  padding: "0.3rem",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                <FiX size={16} />
              </button>
            </div>
            {/* Progress bar */}
            <div style={{ marginTop: "1rem", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, var(--color-secondary), var(--color-primary))" }}
              />
            </div>
          </div>

          {/* Questions */}
          <div style={{ maxHeight: "58vh", overflowY: "auto", padding: "1rem 1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {normalized.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      borderRadius: "var(--radius-lg)",
                      border: `1px solid ${isAnswered ? "rgba(16,185,129,0.15)" : "var(--color-border)"}`,
                      background: isAnswered ? "rgba(16,185,129,0.02)" : "rgba(18,18,24,0.5)",
                      padding: "1.1rem 1.15rem",
                      transition: "border-color 200ms ease, background 200ms ease",
                    }}
                  >
                    {/* Question number + text */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.75rem" }}>
                      <div
                        style={{
                          width: "1.55rem",
                          height: "1.55rem",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: isAnswered ? "#fff" : "var(--color-text-dim)",
                          background: isAnswered ? "var(--color-accent)" : "rgba(255,255,255,0.05)",
                          border: isAnswered ? "none" : "1px solid var(--color-border)",
                          flexShrink: 0,
                          transition: "all 200ms ease",
                        }}
                      >
                        {isAnswered ? <FiCheck size={10} /> : idx + 1}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)", lineHeight: 1.5, flex: 1 }}>
                        {q.question}
                      </div>
                    </div>

                    {q.type === "mcq" && Array.isArray(q.options) ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginLeft: "2.2rem" }}>
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answers[q.id] === opt;
                          const optLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                          return (
                            <label
                              key={opt}
                              style={{
                                display: "flex",
                                cursor: "pointer",
                                alignItems: "center",
                                gap: "0.6rem",
                                borderRadius: "var(--radius-md)",
                                padding: "0.6rem 0.75rem",
                                border: isSelected ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--color-border)",
                                background: isSelected ? "rgba(99,102,241,0.06)" : "rgba(14,14,18,0.5)",
                                transition: "all 180ms ease",
                              }}
                              onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = "rgba(22,22,28,0.6)"; e.currentTarget.style.borderColor = "var(--color-border-strong)"; } }}
                              onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = "rgba(14,14,18,0.5)"; e.currentTarget.style.borderColor = "var(--color-border)"; } }}
                            >
                              <div
                                style={{
                                  width: "1.25rem",
                                  height: "1.25rem",
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  border: isSelected ? "none" : "1.5px solid var(--color-border-strong)",
                                  background: isSelected ? "var(--color-primary)" : "transparent",
                                  display: "grid",
                                  placeItems: "center",
                                  transition: "all 150ms ease",
                                  boxShadow: isSelected ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
                                }}
                              >
                                {isSelected && <FiCheck size={9} color="#fff" />}
                              </div>
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={isSelected}
                                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                                style={{ display: "none" }}
                              />
                              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: isSelected ? "var(--color-primary-light)" : "var(--color-text-dim)", minWidth: "1rem" }}>
                                {optLetter}.
                              </span>
                              <span style={{ fontSize: "0.85rem", color: "var(--color-text)", lineHeight: 1.45 }}>
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ marginLeft: "2.2rem" }}>
                        <textarea
                          style={{
                            width: "100%",
                            padding: "0.65rem 0.8rem",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border-strong)",
                            background: "rgba(14,14,18,0.7)",
                            color: "var(--color-text)",
                            fontFamily: "var(--font-body)",
                            fontSize: "0.85rem",
                            outline: "none",
                            resize: "vertical",
                            minHeight: "5rem",
                            lineHeight: 1.55,
                            transition: "border-color 200ms ease, box-shadow 200ms ease",
                          }}
                          placeholder="Write your answer..."
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                          onFocus={(e) => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px var(--color-ring)"; }}
                          onBlur={(e) => { e.target.style.borderColor = "var(--color-border-strong)"; e.target.style.boxShadow = "none"; }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--color-border)", padding: "1rem 1.5rem", background: "rgba(14,14,18,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
              {answeredCount}/{totalCount} answered
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ fontSize: "0.82rem", padding: "0.5rem 1rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-primary"
                style={{
                  fontSize: "0.82rem",
                  padding: "0.5rem 1.25rem",
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? (
                  <><span className="spinner" /> Submitting...</>
                ) : (
                  <><FiSend size={13} /> Submit Answers</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
