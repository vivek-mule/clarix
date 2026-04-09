import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token || null;
}

export function getAccessToken() {
  return _accessToken;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

export async function register({ email, password, name, subject }) {
  const res = await api.post("/auth/register", { email, password, name, subject });
  return res.data;
}

export async function login({ email, password }) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function getStudentProfile() {
  const res = await api.get("/student/profile");
  return res.data;
}

export async function saveOnboarding({ learning_style, knowledge_levels, learning_path }) {
  const res = await api.post("/student/onboarding", { learning_style, knowledge_levels, learning_path });
  return res.data;
}

export async function getProgress() {
  const res = await api.get("/student/progress");
  return res.data;
}

export async function agentStartSession({ message }) {
  const res = await api.post("/agent/start-session", { message });
  return res.data;
}

export async function agentSubmitAnswer({ session_id, answer }) {
  const res = await api.post("/agent/submit-answer", { session_id, answer });
  return res.data;
}

function _parseSseEvent(block) {
  const lines = block.split("\n").filter(Boolean);
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    else if (line.startsWith("data:")) data += line.slice("data:".length).trimStart();
  }
  return { event, data };
}

/**
 * Streams tokens from GET /agent/stream?session_id=... using fetch so we can
 * include Authorization headers (EventSource can't).
 *
 * onToken(token: string)
 * onDone()
 * onError(message: string)
 */
export async function streamAgentTokens({ session_id, signal, onToken, onDone, onError }) {
  const url = new URL(`${API_BASE_URL.replace(/\/$/, "")}/agent/stream`);
  url.searchParams.set("session_id", session_id);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`SSE failed (${res.status}): ${text || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!rawEvent.trim()) continue;

      const evt = _parseSseEvent(rawEvent);
      if (evt.event === "done") {
        onDone?.();
        return;
      }
      if (evt.event === "error") {
        onError?.(evt.data || "Stream error");
        onDone?.();
        return;
      }
      if (evt.data && evt.data !== "[DONE]") {
        onToken?.(evt.data);
      }
    }
  }
}
