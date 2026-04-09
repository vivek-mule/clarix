import { useEffect, useMemo, useState } from "react";
import { agentStartSession, agentSubmitAnswer } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useSSE } from "../hooks/useSSE.js";
import QuizModal from "../components/QuizModal.jsx";

function Bubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      <div
        className={`max-w-[86%] rounded-2xl border px-4 py-3 ${
          isUser
            ? "border-cyan-700/30 bg-gradient-to-r from-cyan-700 to-sky-700 text-white"
            : "border-[var(--color-border)] bg-white text-[var(--color-text)]"
        }`}
      >
        <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wider ${isUser ? "text-cyan-100" : "text-[var(--color-text-muted)]"}`}>
          {isUser ? "You" : "Tutor"}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function LearningSession() {
  const { profile } = useAuth();

  const [sessionId, setSessionId] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [actionError, setActionError] = useState(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const { text: streamedText, isStreaming, error: streamError, start: startStream } = useSSE({
    sessionId,
    enabled: Boolean(sessionId),
  });

  const quizQuestions = sessionMeta?.quiz_results?.questions || [];
  const awaitingQuiz = Boolean(sessionMeta?.quiz_results?.awaiting_answers && quizQuestions?.length);

  useEffect(() => {
    if (awaitingQuiz) setQuizOpen(true);
  }, [awaitingQuiz]);

  const canStart = useMemo(() => !sessionId, [sessionId]);
  const currentModule = sessionMeta?.current_module || {};
  const masteryScore = typeof sessionMeta?.mastery_score === "number" ? sessionMeta.mastery_score : null;

  const startSession = async () => {
    setActionError(null);
    const firstMessage =
      input.trim() ||
      `Help me learn ${profile?.subject || "this subject"}. Start with my current level and teach me one module.`;

    setMessages((prev) => [...prev, { role: "user", content: firstMessage }]);
    setInput("");

    try {
      const res = await agentStartSession({ message: firstMessage });
      setSessionId(res.session_id);
      setSessionMeta(res);
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Could not start session");
    }
  };

  const sendMessage = async () => {
    if (!sessionId) {
      await startSession();
      return;
    }

    const msg = input.trim();
    if (!msg) return;

    setActionError(null);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");

    try {
      const res = await agentSubmitAnswer({ session_id: sessionId, answer: msg });
      setSessionMeta(res);
      startStream();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Failed to send message");
    }
  };

  const readyForQuiz = async () => {
    if (!sessionId) return;

    setActionError(null);
    try {
      const res = await agentSubmitAnswer({ session_id: sessionId, answer: "I'm ready for a quiz now." });
      setSessionMeta(res);
      startStream();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Could not start quiz");
    }
  };

  const submitQuiz = async (answersArray) => {
    if (!sessionId) return;

    setQuizSubmitting(true);
    setActionError(null);
    try {
      // feedback_agent expects answers as raw text; JSON string works well.
      const payload = JSON.stringify(answersArray);
      const res = await agentSubmitAnswer({ session_id: sessionId, answer: payload });
      setSessionMeta(res);
      setQuizOpen(false);
      startStream();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Quiz submission failed");
    } finally {
      setQuizSubmitting(false);
    }
  };

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="surface-card flex min-h-[68vh] flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="section-kicker">Realtime tutor</span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Learning session</h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Ask concept questions, receive streamed explanations, and trigger quizzes when ready.
              </p>
            </div>
            <div className="badge">{isStreaming ? "Streaming" : "Idle"}</div>
          </div>

          {streamError ? <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{streamError}</div> : null}
          {actionError ? <div className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-white/85 p-4">
            {messages.map((m, idx) => (
              <Bubble key={idx} role={m.role}>
                {m.content}
              </Bubble>
            ))}

            {(streamedText || isStreaming) && (
              <Bubble role="assistant">
                {streamedText || ""}
                {isStreaming ? <span className="opacity-70"> ▍</span> : null}
              </Bubble>
            )}

            {!messages.length && !streamedText ? (
              <div className="grid h-full min-h-[230px] place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-soft)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                Start by asking what topic you want to learn. The orchestrator will route your session automatically.
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canStart ? "What do you want to learn today?" : "Ask a follow-up or respond..."}
              className="input-control mt-0 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="button" onClick={sendMessage} className="btn-primary whitespace-nowrap">
              {canStart ? "Start" : "Send"}
            </button>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <div className="section-kicker">Session state</div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Session ID</div>
                <div className="mt-1 truncate font-semibold text-[var(--color-text)]">{sessionId || "Not started"}</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Current module</div>
                <div className="mt-1 font-semibold text-[var(--color-text)]">{currentModule?.topic || "Awaiting orchestration"}</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Mastery score</div>
                <div className="mt-1 font-semibold text-[var(--color-text)]">{masteryScore !== null ? `${Math.round(masteryScore * 100)}%` : "Not available"}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={readyForQuiz}
              disabled={!sessionId}
              className="btn-ghost mt-4 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ready for quiz
            </button>
          </div>

          <div className="surface-card-soft p-5">
            <div className="section-kicker">Tip</div>
            <h2 className="mt-2 text-lg font-bold tracking-tight">Get better adaptive responses</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Mention your exact confusion point, like “I understand formulas but not intuition”.
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              When done with a concept, use the quiz button so mastery routing can move you ahead.
            </p>
          </div>
        </aside>
      </div>

      <QuizModal
        open={quizOpen}
        questions={quizQuestions}
        submitting={quizSubmitting}
        onClose={() => setQuizOpen(false)}
        onSubmit={submitQuiz}
      />
    </section>
  );
}

