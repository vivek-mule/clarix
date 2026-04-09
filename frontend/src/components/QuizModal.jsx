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
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] px-5 py-4 sm:px-6">
          <div>
            <div className="badge">Knowledge check</div>
            <h3 className="mt-1 text-xl font-bold tracking-tight">Quiz</h3>
          </div>
          <button className="btn-secondary text-sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            {normalized.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Question {idx + 1}
                </div>
                <div className="mt-1 font-semibold text-[var(--color-text)]">{q.question}</div>

                {q.type === "mcq" && Array.isArray(q.options) ? (
                  <div className="mt-4 grid gap-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                        />
                        <span className="text-sm text-[var(--color-text)]">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="textarea-control mt-4"
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

        <div className="border-t border-[var(--color-border)] bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full text-base disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </button>
        </div>
      </div>
    </div>
  );
}

