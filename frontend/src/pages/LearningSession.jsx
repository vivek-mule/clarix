import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { agentStartSession, agentSubmitAnswer, getAgentSession } from "../lib/api.js";
import { useSSE } from "../hooks/useSSE.js";
import QuizModal from "../components/QuizModal.jsx";

function Bubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: "0.5rem" }}>
      <div
        style={{
          maxWidth: "86%",
          borderRadius: "1.15rem",
          border: isUser
            ? "1px solid rgba(0, 212, 255, 0.2)"
            : "1px solid var(--color-border)",
          padding: "0.85rem 1.1rem",
          background: isUser
            ? "linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(0, 144, 204, 0.08))"
            : "var(--color-surface-soft)",
          transition: "transform 150ms ease",
        }}
      >
        <div
          style={{
            marginBottom: "0.35rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: isUser ? "var(--color-primary)" : "var(--color-text-dim)",
          }}
        >
          {isUser ? "You" : "Tutor"}
        </div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: "0.88rem",
            lineHeight: 1.65,
            color: "var(--color-text)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LearningSession() {
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const { text: streamedText, isStreaming, error: streamError, start: startStream, reset: resetStream } = useSSE({
    sessionId,
    enabled: Boolean(sessionId),
  });

  const quizQuestions = sessionMeta?.quiz_results?.questions || [];
  const awaitingQuiz = Boolean(sessionMeta?.quiz_results?.awaiting_answers && quizQuestions?.length);

  useEffect(() => {
    if (awaitingQuiz) setQuizOpen(true);
  }, [awaitingQuiz]);

  useEffect(() => {
    const existingSessionId = searchParams.get("session_id");
    if (!existingSessionId) return;

    let mounted = true;
    setRestoring(true);
    setActionError(null);

    getAgentSession({ session_id: existingSessionId })
      .then((res) => {
        if (!mounted) return;
        setSessionId(res.session_id || existingSessionId);
        setSessionMeta({
          session_id: res.session_id || existingSessionId,
          next_action: res.next_action || "",
          current_agent: res.current_agent || "",
          current_module: res.current_module || {},
          diagnostic_results: res.diagnostic_results || {},
          quiz_results: res.quiz_results || {},
          mastery_score: typeof res.mastery_score === "number" ? res.mastery_score : -1,
        });
        const restoredMessages = Array.isArray(res.messages)
          ? res.messages.filter((m) => m && (m.role === "user" || m.role === "assistant"))
          : [];
        setMessages(restoredMessages);
      })
      .catch((e) => {
        if (!mounted) return;
        setActionError(e?.response?.data?.detail || e?.message || "Could not restore session");
      })
      .finally(() => {
        if (mounted) setRestoring(false);
      });

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (isStreaming) return;
    if (!streamedText) return;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last?.content === streamedText) return prev;
      return [...prev, { role: "assistant", content: streamedText }];
    });
    resetStream();
  }, [isStreaming, streamedText, resetStream]);

  const canStart = useMemo(() => !sessionId, [sessionId]);
  const currentModule = sessionMeta?.current_module || {};
  const masteryScore = typeof sessionMeta?.mastery_score === "number" ? sessionMeta.mastery_score : null;

  const startSession = async () => {
    setActionError(null);
    const firstMessage =
      input.trim() ||
      "Help me learn this topic from basics and include practical examples.";

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

  const alertStyle = (type) => ({
    marginTop: "0.75rem",
    borderRadius: "var(--radius-xl)",
    border: `1px solid ${type === "info" ? "rgba(0, 212, 255, 0.2)" : "rgba(255, 77, 106, 0.25)"}`,
    background: type === "info" ? "var(--color-primary-glow)" : "var(--color-danger-soft)",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    color: type === "info" ? "var(--color-primary)" : "var(--color-danger)",
  });

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="surface-card flex min-h-[68vh] flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="section-kicker">Realtime tutor</span>
              <h1
                style={{
                  marginTop: "0.3rem",
                  fontSize: "1.45rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Learning session
              </h1>
              <p style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                Ask concept questions, receive streamed explanations, and trigger quizzes when ready.
              </p>
            </div>
            <div
              className="badge"
              style={{
                background: isStreaming
                  ? "linear-gradient(135deg, rgba(0, 232, 157, 0.15), rgba(0, 232, 157, 0.05))"
                  : undefined,
                border: isStreaming
                  ? "1px solid rgba(0, 232, 157, 0.25)"
                  : undefined,
                color: isStreaming ? "var(--color-accent)" : undefined,
              }}
            >
              {isStreaming && (
                <span
                  style={{
                    display: "inline-block",
                    width: "0.45rem",
                    height: "0.45rem",
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                    animation: "pulse-dot 1.5s ease-in-out infinite",
                    marginRight: "0.15rem",
                  }}
                />
              )}
              {isStreaming ? "Streaming" : "Idle"}
            </div>
          </div>

          {restoring && <div style={alertStyle("info")}>Restoring session...</div>}
          {streamError && <div style={alertStyle("error")}>{streamError}</div>}
          {actionError && <div style={alertStyle("error")}>{actionError}</div>}

          {/* Messages area */}
          <div
            className="mt-5"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              overflowY: "auto",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
              background: "rgba(8, 12, 26, 0.5)",
              padding: "1.15rem",
            }}
          >
            {messages.map((m, idx) => (
              <Bubble key={idx} role={m.role}>
                {m.content}
              </Bubble>
            ))}

            {(streamedText || isStreaming) && (
              <Bubble role="assistant">
                {streamedText || ""}
                {isStreaming ? (
                  <span
                    style={{
                      opacity: 0.6,
                      color: "var(--color-primary)",
                      animation: "blink 1s step-end infinite",
                    }}
                  >
                    {" "}▍
                  </span>
                ) : null}
              </Bubble>
            )}

            {!messages.length && !streamedText ? (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  minHeight: "230px",
                  borderRadius: "var(--radius-xl)",
                  border: "1px dashed var(--color-border-strong)",
                  background: "var(--color-surface-soft)",
                  padding: "2rem",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  color: "var(--color-text-muted)",
                  height: "100%",
                }}
              >
                <div>
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💡</div>
                  Start by asking what topic you want to learn. The orchestrator will route your session automatically.
                </div>
              </div>
            ) : null}
          </div>

          <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>

          {/* Input area */}
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
          {/* Session state panel */}
          <div className="surface-card p-5">
            <div className="section-kicker">Session state</div>
            <div className="mt-3 space-y-3">
              {[
                { label: "Session ID", value: sessionId || "Not started" },
                { label: "Current module", value: currentModule?.topic || "Awaiting orchestration" },
                {
                  label: "Mastery score",
                  value: masteryScore !== null ? `${Math.round(masteryScore * 100)}%` : "Not available",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-soft)",
                    padding: "0.65rem 0.85rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={readyForQuiz}
              disabled={!sessionId}
              className="btn-ghost mt-4 w-full text-sm"
              style={{
                opacity: !sessionId ? 0.5 : 1,
                cursor: !sessionId ? "not-allowed" : "pointer",
              }}
            >
              🎯 Ready for quiz
            </button>
          </div>

          {/* Tip card */}
          <div className="surface-card-soft p-5">
            <div className="section-kicker">Tip</div>
            <h2
              style={{
                marginTop: "0.5rem",
                fontSize: "1.05rem",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--color-text)",
              }}
            >
              Get better adaptive responses
            </h2>
            <p style={{ marginTop: "0.55rem", fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              Mention your exact confusion point, like "I understand formulas but not intuition".
            </p>
            <p style={{ marginTop: "0.45rem", fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
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
