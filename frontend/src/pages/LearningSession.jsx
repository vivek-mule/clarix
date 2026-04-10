import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiSend, FiPlus, FiClock, FiChevronRight, FiChevronLeft,
  FiCpu, FiDatabase, FiMessageSquare, FiCheck, FiLoader,
  FiTarget, FiBookOpen, FiZap, FiX, FiLayers, FiHash,
  FiActivity,
} from "react-icons/fi";

import { agentStartSession, agentSubmitAnswer, getAgentSession, getAgentSessions } from "../lib/api.js";
import { useSSE } from "../hooks/useSSE.js";
import QuizModal from "../components/QuizModal.jsx";

/* ── Helpers ── */
function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString();
}

/* ── Reasoning Step (side panel) ── */
function ReasoningStep({ icon: Icon, label, status, color }) {
  return (
    <div className="reasoning-step" style={{ padding: "0.4rem 0" }}>
      <div
        className="reasoning-step-icon"
        style={{
          width: "1.35rem",
          height: "1.35rem",
          background: status === "done" ? `${color}18` : status === "active" ? `${color}12` : "rgba(255,255,255,0.03)",
          color: status === "done" ? color : status === "active" ? color : "var(--color-text-dim)",
          border: `1.5px solid ${status === "active" ? `${color}40` : status === "done" ? `${color}25` : "rgba(255,255,255,0.06)"}`,
          transition: "all 250ms ease",
        }}
      >
        {status === "done" ? (
          <FiCheck size={9} />
        ) : status === "active" ? (
          <FiLoader size={9} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Icon size={9} />
        )}
      </div>
      <span
        style={{
          color: status === "done" ? "var(--color-text)" : status === "active" ? color : "var(--color-text-dim)",
          fontWeight: status === "active" ? 600 : 400,
          fontSize: "0.8rem",
          transition: "color 200ms ease",
        }}
      >
        {label}
      </span>
      {status === "active" && (
        <div className="thinking-dots" style={{ marginLeft: "auto" }}>
          <span /><span /><span />
        </div>
      )}
    </div>
  );
}

/* ── Live Reasoning Card (shown inline in chat) ── */
function LiveReasoningCard({ currentAgent, isThinking, isStreaming, hasChunks }) {
  if (!isThinking && !isStreaming) return null;

  const steps = [
    { id: "orchestrator", icon: FiCpu, label: "Routing to the right agent...", color: "#6366f1" },
    { id: "retrieval", icon: FiDatabase, label: "Retrieving relevant content from knowledge base...", color: "#06b6d4" },
    { id: "generation", icon: FiBookOpen, label: "Generating personalized response...", color: "#a855f7" },
  ];

  const agentMap = { orchestrator: 0, assessment: 1, curriculum: 1, content_delivery: 2, feedback: 2 };
  const activeIdx = agentMap[currentAgent] ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.04), rgba(168,85,247,0.03))",
        border: "1px solid rgba(99,102,241,0.12)",
        maxWidth: "85%",
      }}
    >
      <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-primary-light)", marginBottom: "0.55rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <FiCpu size={10} /> Agent Reasoning
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        {steps.map((step, i) => {
          let status = "pending";
          if (isStreaming && i <= 2) status = "done";
          else if (i < activeIdx) status = "done";
          else if (i === activeIdx && isThinking) status = "active";
          else if (hasChunks && i === 1) status = "done";

          return (
            <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", padding: "0.2rem 0" }}>
              <div
                style={{
                  width: "1.15rem",
                  height: "1.15rem",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: status === "done" ? `${step.color}18` : status === "active" ? `${step.color}10` : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${status === "active" ? `${step.color}45` : status === "done" ? `${step.color}25` : "rgba(255,255,255,0.06)"}`,
                  color: status === "done" ? step.color : status === "active" ? step.color : "var(--color-text-dim)",
                  transition: "all 300ms ease",
                }}
              >
                {status === "done" ? <FiCheck size={8} /> : status === "active" ? <FiLoader size={8} style={{ animation: "spin 1s linear infinite" }} /> : <step.icon size={8} />}
              </div>
              <span
                style={{
                  color: status === "done" ? "var(--color-text-muted)" : status === "active" ? "var(--color-text)" : "var(--color-text-dim)",
                  fontWeight: status === "active" ? 600 : 400,
                  transition: "color 200ms ease",
                }}
              >
                {step.label}
              </span>
              {status === "active" && (
                <div className="thinking-dots" style={{ marginLeft: "auto" }}>
                  <span /><span /><span />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Chat Bubble ── */
function Bubble({ role, children, isStreaming }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", maxWidth: "100%" }}
    >
      <div
        style={{
          maxWidth: isUser ? "70%" : "85%",
          padding: isUser ? "0.7rem 1rem" : "0.85rem 1.1rem",
          borderRadius: isUser
            ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
            : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
          background: isUser
            ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06))"
            : "rgba(18,18,24,0.55)",
          border: isUser
            ? "1px solid rgba(99,102,241,0.18)"
            : "1px solid var(--color-border)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            marginBottom: "0.35rem",
            fontSize: "0.62rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: isUser ? "var(--color-primary-light)" : "var(--color-text-dim)",
          }}
        >
          {isUser ? <>You</> : <><FiZap size={9} /> Clarix AI</>}
        </div>
        {isUser ? (
          <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.65, color: "var(--color-text)" }}>{children}</div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ""}</ReactMarkdown>
            {isStreaming && (
              <span style={{ color: "var(--color-primary-light)", animation: "blink 1s step-end infinite", fontWeight: 700 }}> ▍</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═════════════════════════ MAIN ═════════════════════════ */
export default function LearningSession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [allSessions, setAllSessions] = useState([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isBusy, setIsBusy] = useState(false); // prevents double-clicks

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { text: streamedText, isStreaming, error: streamError, start: startStream, reset: resetStream } = useSSE({
    sessionId,
    enabled: Boolean(sessionId),
  });

  const quizQuestions = sessionMeta?.quiz_results?.questions || [];
  const awaitingQuiz = Boolean(sessionMeta?.quiz_results?.awaiting_answers && quizQuestions?.length);

  useEffect(() => { if (awaitingQuiz) setQuizOpen(true); }, [awaitingQuiz]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamedText, isStreaming]);
  useEffect(() => { if (isStreaming) { setIsThinking(false); setIsBusy(false); } }, [isStreaming]);

  // Load all sessions for sidebar
  useEffect(() => {
    getAgentSessions().then((rows) => setAllSessions(Array.isArray(rows) ? rows : [])).catch(() => {});
  }, [sessionId]);

  // Restore session from URL
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
          retrieved_chunks: res.retrieved_chunks || [],
        });
        const restored = Array.isArray(res.messages)
          ? res.messages.filter((m) => m && (m.role === "user" || m.role === "assistant"))
          : [];
        setMessages(restored);
      })
      .catch((e) => {
        if (!mounted) return;
        setActionError(e?.response?.data?.detail || e?.message || "Could not restore session");
      })
      .finally(() => { if (mounted) setRestoring(false); });
    return () => { mounted = false; };
  }, [searchParams]);

  // Commit streamed text
  useEffect(() => {
    if (isStreaming || !streamedText) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last?.content === streamedText) return prev;
      return [...prev, { role: "assistant", content: streamedText }];
    });
    resetStream();
  }, [isStreaming, streamedText, resetStream]);

  const canStart = useMemo(() => !sessionId, [sessionId]);
  const currentModule = sessionMeta?.current_module || {};
  const masteryScore = typeof sessionMeta?.mastery_score === "number" && sessionMeta.mastery_score >= 0 ? sessionMeta.mastery_score : null;
  const currentAgent = sessionMeta?.current_agent || "";
  const retrievedChunks = sessionMeta?.retrieved_chunks || [];

  const reasoningSteps = useMemo(() => {
    const map = { orchestrator: 0, assessment: 1, curriculum: 1, content_delivery: 2, feedback: 3 };
    const activeIdx = map[currentAgent] ?? -1;
    return [
      { icon: FiCpu, label: "Analyzing request", color: "#6366f1", status: isThinking ? (activeIdx >= 0 ? "done" : "active") : (currentAgent ? "done" : "pending") },
      { icon: FiDatabase, label: "Retrieving context", color: "#06b6d4", status: isThinking ? (activeIdx >= 2 ? "done" : activeIdx >= 1 ? "active" : "pending") : (retrievedChunks.length > 0 ? "done" : "pending") },
      { icon: FiBookOpen, label: "Generating response", color: "#a855f7", status: isStreaming ? "active" : (isThinking ? "pending" : (messages.length > 0 ? "done" : "pending")) },
      { icon: FiTarget, label: "Evaluating mastery", color: "#10b981", status: masteryScore !== null ? "done" : "pending" },
    ];
  }, [currentAgent, isThinking, isStreaming, retrievedChunks, messages, masteryScore]);

  /* ── Actions ── */
  const startSession = useCallback(async () => {
    if (isBusy) return;
    setActionError(null);
    setIsBusy(true);
    const firstMessage = input.trim() || "Help me learn this topic from basics with practical examples.";
    setMessages((prev) => [...prev, { role: "user", content: firstMessage }]);
    setInput("");
    setIsThinking(true);
    try {
      const res = await agentStartSession({ message: firstMessage });
      setSessionId(res.session_id);
      setSessionMeta(res);
      setSearchParams({ session_id: res.session_id }, { replace: true });
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Could not start session");
      setIsThinking(false);
      setIsBusy(false);
    }
  }, [isBusy, input, setSearchParams]);

  const sendMessage = useCallback(async () => {
    if (isBusy) return;
    if (!sessionId) { await startSession(); return; }
    const msg = input.trim();
    if (!msg) return;
    setActionError(null);
    setIsBusy(true);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setIsThinking(true);
    try {
      const res = await agentSubmitAnswer({ session_id: sessionId, answer: msg });
      setSessionMeta(res);
      startStream();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Failed to send message");
      setIsThinking(false);
      setIsBusy(false);
    }
  }, [isBusy, sessionId, input, startSession, startStream]);

  const readyForQuiz = useCallback(async () => {
    if (!sessionId || isBusy) return;
    setActionError(null);
    setIsBusy(true);
    setIsThinking(true);
    // Add as user message immediately so user sees feedback
    setMessages((prev) => [...prev, { role: "user", content: "I'm ready for a quiz now." }]);
    try {
      const res = await agentSubmitAnswer({ session_id: sessionId, answer: "I'm ready for a quiz now." });
      setSessionMeta(res);
      startStream();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e?.message || "Could not start quiz");
      setIsThinking(false);
      setIsBusy(false);
    }
  }, [sessionId, isBusy, startStream]);

  const submitQuiz = useCallback(async (answersArray) => {
    if (!sessionId) return;
    setQuizSubmitting(true);
    setActionError(null);
    try {
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
  }, [sessionId, startStream]);

  const newSession = () => {
    setSessionId(null);
    setSessionMeta(null);
    setMessages([]);
    setActionError(null);
    setInput("");
    setIsThinking(false);
    setIsBusy(false);
    resetStream();
    setSearchParams({}, { replace: true });
  };

  const switchSession = (sid) => {
    setSessionId(null);
    setSessionMeta(null);
    setMessages([]);
    setActionError(null);
    setInput("");
    setIsThinking(false);
    setIsBusy(false);
    resetStream();
    setSearchParams({ session_id: sid }, { replace: true });
  };

  return (
    <>
      <section
        style={{
          height: "calc(100vh - 5rem)",
          display: "flex",
          overflow: "hidden",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          background: "rgba(9,9,11,0.65)",
          backdropFilter: "blur(12px)",
          marginTop: "0.75rem",
        }}
      >
        {/* ═══ LEFT SIDEBAR ═══ */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRight: "1px solid var(--color-border)",
                background: "rgba(9,9,11,0.5)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div style={{ padding: "0.65rem", borderBottom: "1px solid var(--color-border)" }}>
                <button onClick={newSession} className="btn-primary" style={{ width: "100%", fontSize: "0.78rem", padding: "0.5rem", gap: "0.3rem" }}>
                  <FiPlus size={13} /> New Chat
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0.4rem" }}>
                {allSessions.length === 0 && (
                  <div style={{ padding: "1.5rem 0.75rem", textAlign: "center" }}>
                    <FiMessageSquare size={20} style={{ color: "var(--color-text-dim)", margin: "0 auto 0.4rem", opacity: 0.5 }} />
                    <p style={{ fontSize: "0.72rem", color: "var(--color-text-dim)" }}>No sessions yet</p>
                  </div>
                )}
                {allSessions.map((s) => {
                  const isActive = s.session_id === sessionId;
                  return (
                    <div
                      key={s.session_id}
                      onClick={() => switchSession(s.session_id)}
                      style={{
                        padding: "0.6rem 0.7rem",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                        border: isActive ? "1px solid rgba(99,102,241,0.18)" : "1px solid transparent",
                        background: isActive ? "rgba(99,102,241,0.06)" : "transparent",
                        marginBottom: "0.15rem",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: isActive ? 600 : 400, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title || "Untitled"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--color-text-dim)", marginTop: "0.1rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <FiClock size={9} /> {fmtDate(s.last_message_at || s.updated_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ CENTER CHAT ═══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top bar */}
          <div
            style={{
              padding: "0.55rem 0.85rem",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(14,14,18,0.3)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", padding: "0.25rem", borderRadius: "0.3rem", transition: "background 150ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                {sidebarOpen ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
              </button>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  {sessionId ? (
                    <>{currentModule?.topic || "Learning Session"}</>
                  ) : (
                    <><FiZap size={13} style={{ color: "var(--color-primary-light)" }} /> New Chat</>
                  )}
                </div>
                {sessionId && (
                  <div style={{ fontSize: "0.65rem", color: "var(--color-text-dim)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    {currentAgent && <><FiActivity size={9} /> {currentAgent.replace(/_/g, " ")}</>}
                    {masteryScore !== null && <><span style={{ opacity: 0.4 }}>·</span> Mastery {Math.round(masteryScore * 100)}%</>}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {isStreaming && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "var(--color-accent)", fontWeight: 600, background: "var(--color-accent-glow)", padding: "0.2rem 0.5rem", borderRadius: "999px", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <span className="status-dot" style={{ width: "0.3rem", height: "0.3rem" }} /> Live
                </div>
              )}
              {isThinking && !isStreaming && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "var(--color-primary-light)", fontWeight: 600, background: "var(--color-primary-glow)", padding: "0.2rem 0.5rem", borderRadius: "999px", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <span className="spinner" style={{ width: "0.6rem", height: "0.6rem" }} /> Thinking
                </div>
              )}
              {sessionId && (
                <button
                  onClick={readyForQuiz}
                  disabled={isBusy || isThinking || isStreaming}
                  className="btn-ghost"
                  style={{
                    fontSize: "0.7rem",
                    padding: "0.25rem 0.55rem",
                    gap: "0.25rem",
                    opacity: (isBusy || isThinking || isStreaming) ? 0.4 : 1,
                    cursor: (isBusy || isThinking || isStreaming) ? "not-allowed" : "pointer",
                  }}
                >
                  <FiTarget size={11} /> Quiz
                </button>
              )}
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                style={{ background: rightPanelOpen ? "rgba(255,255,255,0.04)" : "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", padding: "0.3rem", borderRadius: "0.3rem", transition: "background 150ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = rightPanelOpen ? "rgba(255,255,255,0.04)" : "none"; }}
              >
                <FiLayers size={15} />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {restoring && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", fontSize: "0.82rem", color: "var(--color-primary-light)" }}>
                <span className="spinner" /> Restoring session...
              </div>
            )}

            {actionError && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                style={{ borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.2)", background: "var(--color-danger-soft)", padding: "0.6rem 0.85rem", fontSize: "0.8rem", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                {actionError}
                <button onClick={() => setActionError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", display: "flex" }}><FiX size={14} /></button>
              </motion.div>
            )}

            {streamError && (
              <div style={{ borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.2)", background: "var(--color-danger-soft)", padding: "0.6rem 0.85rem", fontSize: "0.8rem", color: "var(--color-danger)" }}>
                {streamError}
              </div>
            )}

            {messages.map((m, idx) => (
              <Bubble key={idx} role={m.role}>{m.content}</Bubble>
            ))}

            {(streamedText || isStreaming) && (
              <Bubble role="assistant" isStreaming={isStreaming}>{streamedText || ""}</Bubble>
            )}

            {/* Live Reasoning — shown inline in chat when thinking */}
            <AnimatePresence>
              {(isThinking || (isStreaming && !streamedText)) && (
                <LiveReasoningCard
                  currentAgent={currentAgent}
                  isThinking={isThinking}
                  isStreaming={isStreaming}
                  hasChunks={retrievedChunks.length > 0}
                />
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!messages.length && !streamedText && !isThinking && (
              <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ textAlign: "center", maxWidth: "28rem" }}
                >
                  <div
                    style={{
                      width: "4rem",
                      height: "4rem",
                      borderRadius: "1rem",
                      background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06))",
                      border: "1px solid rgba(99,102,241,0.12)",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 1.25rem",
                    }}
                  >
                    <FiMessageSquare size={22} style={{ color: "var(--color-primary-light)" }} />
                  </div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.4rem", fontFamily: "var(--font-display)" }}>
                    Start a conversation
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.65, marginBottom: "1.25rem" }}>
                    Ask about any topic you want to learn. Clarix will analyze your level, retrieve relevant materials, and teach you with adaptive content.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                    {["Explain neural networks", "Teach me NLP basics", "What is attention mechanism?"].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        style={{
                          padding: "0.4rem 0.8rem", borderRadius: "999px",
                          border: "1px solid var(--color-border)", background: "rgba(14,14,18,0.6)",
                          fontSize: "0.78rem", color: "var(--color-text-muted)", cursor: "pointer",
                          transition: "all 180ms ease", fontFamily: "var(--font-body)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; e.currentTarget.style.color = "var(--color-text)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: "0.6rem 0.85rem 0.65rem", borderTop: "1px solid var(--color-border)", background: "rgba(14,14,18,0.3)" }}>
            <div
              style={{
                display: "flex", gap: "0.5rem", maxWidth: "48rem", margin: "0 auto",
                padding: "0.35rem 0.35rem 0.35rem 0.85rem",
                borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)",
                background: "rgba(14,14,18,0.8)", transition: "border-color 200ms ease, box-shadow 200ms ease",
                alignItems: "center",
              }}
              onFocusCapture={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-ring)"; }}
              onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.boxShadow = "none"; } }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={canStart ? "What do you want to learn?" : "Type your message..."}
                style={{
                  flex: 1, padding: "0.35rem 0", background: "transparent", border: "none",
                  color: "var(--color-text)", fontSize: "0.88rem", fontFamily: "var(--font-body)", outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button
                onClick={sendMessage}
                disabled={isBusy || isThinking || isStreaming}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "2.1rem", height: "2.1rem", borderRadius: "var(--radius-md)",
                  border: "none",
                  background: (isBusy || isThinking || isStreaming) ? "rgba(99,102,241,0.2)" : "var(--color-primary)",
                  color: "#fff",
                  cursor: (isBusy || isThinking || isStreaming) ? "not-allowed" : "pointer",
                  transition: "all 150ms ease", flexShrink: 0,
                }}
              >
                <FiSend size={14} />
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: "0.35rem", fontSize: "0.62rem", color: "var(--color-text-dim)" }}>
              Clarix uses AI to teach adaptively. Responses are grounded in your course materials.
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL (wider now: 360px) ═══ */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderLeft: "1px solid var(--color-border)",
                background: "rgba(9,9,11,0.5)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div style={{ padding: "0.6rem 0.95rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <FiCpu size={12} style={{ color: "var(--color-primary-light)" }} /> Reasoning
                </span>
                <button onClick={() => setRightPanelOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", display: "flex", padding: "0.2rem", borderRadius: "0.25rem", transition: "background 150ms ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <FiX size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0.85rem 0.95rem" }}>
                {/* Agent Pipeline */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                    Agent Pipeline
                  </div>
                  <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "rgba(14,14,18,0.5)", padding: "0.55rem 0.75rem" }}>
                    {reasoningSteps.map((step, i) => (
                      <ReasoningStep key={i} {...step} />
                    ))}
                  </div>
                </div>

                {/* Session Info */}
                {sessionId && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                      Session
                    </div>
                    <div style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "rgba(14,14,18,0.5)", overflow: "hidden" }}>
                      {[
                        { label: "Module", val: currentModule?.topic || "Awaiting", icon: FiHash },
                        { label: "Mastery", val: masteryScore !== null ? `${Math.round(masteryScore * 100)}%` : "N/A", icon: FiTarget },
                        { label: "Messages", val: `${messages.length}`, icon: FiMessageSquare },
                      ].map((item, idx) => (
                        <div
                          key={item.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.55rem 0.75rem",
                            fontSize: "0.8rem",
                            borderBottom: idx < 2 ? "1px solid var(--color-border)" : "none",
                            gap: "0.75rem",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--color-text-dim)", flexShrink: 0 }}>
                            <item.icon size={11} /> {item.label}
                          </span>
                          <span style={{ color: "var(--color-text)", fontWeight: 600, textAlign: "right", lineHeight: 1.35, wordBreak: "break-word", minWidth: 0 }}>
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retrieved Chunks */}
                {retrievedChunks.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <FiDatabase size={10} /> Sources ({retrievedChunks.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {retrievedChunks.slice(0, 5).map((chunk, i) => {
                        const text = typeof chunk === "string" ? chunk : chunk?.text || chunk?.metadata?.text || JSON.stringify(chunk);
                        const source = typeof chunk === "object" ? (chunk?.metadata?.source || chunk?.source || "") : "";
                        return (
                          <div key={i} className="chunk-card">
                            {source && (
                              <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-primary-light)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <FiBookOpen size={9} /> {source}
                              </div>
                            )}
                            <div style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", fontSize: "0.77rem", lineHeight: 1.45 }}>
                              {text.slice(0, 250)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!sessionId && (
                  <div style={{ padding: "2rem 0.75rem", textAlign: "center" }}>
                    <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.65rem", background: "var(--color-primary-glow)", display: "grid", placeItems: "center", margin: "0 auto 0.65rem" }}>
                      <FiCpu size={16} style={{ color: "var(--color-primary-light)" }} />
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-dim)", lineHeight: 1.5, maxWidth: "16rem", margin: "0 auto" }}>
                      Start a session to see the agent reasoning pipeline and retrieved source documents.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <QuizModal open={quizOpen} questions={quizQuestions} submitting={quizSubmitting} onClose={() => setQuizOpen(false)} onSubmit={submitQuiz} />
    </>
  );
}
