import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Landing() {
  const { isAuthenticated, profile } = useAuth();
  const primaryCta = isAuthenticated
    ? { to: profile?.onboarding_complete ? "/dashboard" : "/onboarding", label: "Continue journey" }
    : { to: "/auth", label: "Get started" };

  return (
    <section className="py-8 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] fade-in">
        <article className="surface-card p-7 sm:p-10">
          <span className="section-kicker">AI Learning Platform</span>
          <h1 className="page-title mt-3">Modern learning, tuned to each student in real-time.</h1>
          <p className="page-subtitle mt-5 max-w-2xl">
            Pragyantra combines LangGraph agents, RAG retrieval, and semantic assessment to create a calm, structured,
            and deeply personalized learning experience.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={primaryCta.to} className="btn-primary">
              {primaryCta.label}
            </Link>
            <Link to="/session" className="btn-secondary">
              Open learning session
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 stagger">
            <div className="surface-card-soft p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Delivery</div>
              <div className="mt-1 text-xl font-bold text-[var(--color-text)]">Live stream</div>
              <div className="text-sm text-[var(--color-text-muted)]">Token-by-token tutoring responses.</div>
            </div>
            <div className="surface-card-soft p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Modeling</div>
              <div className="mt-1 text-xl font-bold text-[var(--color-text)]">Adaptive path</div>
              <div className="text-sm text-[var(--color-text-muted)]">Roadmap updates after every mastery check.</div>
            </div>
            <div className="surface-card-soft p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Assessment</div>
              <div className="mt-1 text-xl font-bold text-[var(--color-text)]">Semantic quiz</div>
              <div className="text-sm text-[var(--color-text-muted)]">Meaning-based evaluation, not keyword matching.</div>
            </div>
          </div>
        </article>

        <aside className="surface-card p-7 sm:p-8">
          <div className="badge">Session blueprint</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">How a lesson unfolds</h2>
          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="font-semibold">1. Diagnose baseline</div>
              <p className="mt-1 text-[var(--color-text-muted)]">Assessment agent estimates topic-level confidence.</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="font-semibold">2. Build curriculum</div>
              <p className="mt-1 text-[var(--color-text-muted)]">Prerequisites and difficulty are mapped in sequence.</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="font-semibold">3. Teach + retrieve</div>
              <p className="mt-1 text-[var(--color-text-muted)]">RAG fetches material and adapts explanation style.</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/80 p-4">
              <div className="font-semibold">4. Verify mastery</div>
              <p className="mt-1 text-[var(--color-text-muted)]">Quiz feedback routes to advance, re-explain, or remediate.</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 stagger">
        <article className="surface-card-soft p-5">
          <div className="badge">RAG context</div>
          <h3 className="mt-3 text-lg font-bold">Grounded explanations</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Retrieval from Pinecone keeps generated content anchored to your course material.
          </p>
        </article>
        <article className="surface-card-soft p-5">
          <div className="badge">Multi-agent graph</div>
          <h3 className="mt-3 text-lg font-bold">Purpose-specific agents</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Orchestrator, curriculum, feedback, and content-delivery nodes collaborate in one flow.
          </p>
        </article>
        <article className="surface-card-soft p-5">
          <div className="badge">Progress tracking</div>
          <h3 className="mt-3 text-lg font-bold">Visible outcomes</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Dashboard cards and roadmap states show what is complete, current, and next.
          </p>
        </article>
      </div>
    </section>
  );
}

