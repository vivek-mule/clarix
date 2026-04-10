import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

function Input({ label, ...props }) {
  return (
    <label className="form-label">
      {label}
      <input {...props} className="input-control" />
    </label>
  );
}

export default function Auth() {
  const nav = useNavigate();
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create your account"), [mode]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      let authRes;
      if (mode === "login") {
        authRes = await login({ email: form.email, password: form.password });
      } else {
        authRes = await register({
          email: form.email,
          password: form.password,
          name: form.name,
        });
      }
      const next = authRes?.profile?.onboarding_complete ? "/dashboard" : "/onboarding";
      nav(next);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Auth failed");
    }
  };

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="surface-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="bg-gradient-to-br from-cyan-700 to-sky-800 px-7 py-8 text-white sm:px-10 sm:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Learning workspace
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight">{title}</h1>
            <p className="mt-3 text-sm text-cyan-100/95">
              Use your account to access personalized modules, realtime tutor streams, and adaptive quizzes.
            </p>

            <div className="mt-7 space-y-3 text-sm">
              <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">One account per student profile</div>
              <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">Roadmap updates after each mastery score</div>
              <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">RAG-backed explanations from your content base</div>
            </div>
          </aside>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-1 text-sm font-semibold">
              <button
                onClick={() => setMode("login")}
                className={`rounded-lg px-4 py-2 transition ${
                  mode === "login" ? "bg-white text-[var(--color-text)] shadow" : "text-[var(--color-text-muted)]"
                }`}
                type="button"
              >
                Login
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`rounded-lg px-4 py-2 transition ${
                  mode === "signup" ? "bg-white text-[var(--color-text)] shadow" : "text-[var(--color-text-muted)]"
                }`}
                type="button"
              >
                Sign up
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              {mode === "signup" && (
                <>
                  <Input
                    label="Full name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Vivek"
                    required
                  />
                </>
              )}

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Enter your password"
                required
              />

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <button disabled={loading} className="btn-primary w-full text-base disabled:cursor-not-allowed disabled:opacity-70" type="submit">
                {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

