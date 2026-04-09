import { useEffect, useMemo, useRef, useState } from "react";
import { streamAgentTokens } from "../lib/api.js";

export function useSSE({ sessionId, enabled = true }) {
  const [tokens, setTokens] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const text = useMemo(() => tokens.join(""), [tokens]);

  const start = () => {
    if (!sessionId) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTokens([]);
    setError(null);
    setIsStreaming(true);

    streamAgentTokens({
      session_id: sessionId,
      signal: controller.signal,
      onToken: (t) => setTokens((prev) => [...prev, t]),
      onError: (msg) => setError(msg),
      onDone: () => setIsStreaming(false),
    }).catch((e) => {
      if (controller.signal.aborted) return;
      setError(e?.message || "Stream failed");
      setIsStreaming(false);
    });
  };

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setIsStreaming(false);
  };

  useEffect(() => {
    if (!enabled || !sessionId) return;
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, enabled]);

  return { tokens, text, isStreaming, error, start, stop, reset: () => setTokens([]) };
}

