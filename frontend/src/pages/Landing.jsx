import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const featureCards = [
  {
    kicker: "Delivery",
    title: "Live stream",
    desc: "Token-by-token tutoring responses.",
    gradient: "linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.02))",
    borderColor: "rgba(0, 212, 255, 0.12)",
    iconColor: "var(--color-primary)",
  },
  {
    kicker: "Modeling",
    title: "Adaptive path",
    desc: "Roadmap updates after every mastery check.",
    gradient: "linear-gradient(135deg, rgba(123, 97, 255, 0.1), rgba(123, 97, 255, 0.02))",
    borderColor: "rgba(123, 97, 255, 0.12)",
    iconColor: "var(--color-secondary)",
  },
  {
    kicker: "Assessment",
    title: "Semantic quiz",
    desc: "Meaning-based evaluation, not keyword matching.",
    gradient: "linear-gradient(135deg, rgba(0, 232, 157, 0.1), rgba(0, 232, 157, 0.02))",
    borderColor: "rgba(0, 232, 157, 0.12)",
    iconColor: "var(--color-accent)",
  },
];

const steps = [
  { num: "1", title: "Diagnose baseline", desc: "Assessment agent estimates topic-level confidence." },
  { num: "2", title: "Build curriculum", desc: "Prerequisites and difficulty are mapped in sequence." },
  { num: "3", title: "Teach + retrieve", desc: "RAG fetches material and adapts explanation style." },
  { num: "4", title: "Verify mastery", desc: "Quiz feedback routes to advance, re-explain, or remediate." },
];

const bottomCards = [
  {
    badge: "RAG context",
    title: "Grounded explanations",
    desc: "Retrieval from Pinecone keeps generated content anchored to your course material.",
    accentColor: "var(--color-primary)",
  },
  {
    badge: "Multi-agent graph",
    title: "Purpose-specific agents",
    desc: "Orchestrator, curriculum, feedback, and content-delivery nodes collaborate in one flow.",
    accentColor: "var(--color-secondary)",
  },
  {
    badge: "Progress tracking",
    title: "Visible outcomes",
    desc: "Dashboard cards and roadmap states show what is complete, current, and next.",
    accentColor: "var(--color-accent)",
  },
];

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
            {featureCards.map((card) => (
              <div
                key={card.kicker}
                style={{
                  border: `1px solid ${card.borderColor}`,
                  background: card.gradient,
                  borderRadius: "var(--radius-xl)",
                  padding: "1.25rem",
                  backdropFilter: "blur(8px)",
                  transition: "transform 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: card.iconColor,
                  }}
                >
                  {card.kicker}
                </div>
                <div
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--color-text)",
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="surface-card p-7 sm:p-8">
          <div className="badge">Session blueprint</div>
          <h2
            style={{
              marginTop: "0.85rem",
              fontSize: "1.45rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--color-text)",
            }}
          >
            How a lesson unfolds
          </h2>
          <div className="mt-6 space-y-3.5">
            {steps.map((step) => (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  gap: "0.85rem",
                  alignItems: "flex-start",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-soft)",
                  padding: "1rem 1.15rem",
                  transition: "background 200ms ease, border-color 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0, 212, 255, 0.2)";
                  e.currentTarget.style.background = "rgba(20, 28, 55, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.background = "var(--color-surface-soft)";
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minWidth: "1.8rem",
                    height: "1.8rem",
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, var(--color-primary), #0090cc)",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0, 212, 255, 0.2)",
                  }}
                >
                  {step.num}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--color-text)" }}>
                    {step.title}
                  </div>
                  <p style={{ marginTop: "0.2rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 stagger">
        {bottomCards.map((card) => (
          <article
            key={card.badge}
            className="surface-card-soft"
            style={{
              padding: "1.4rem",
              transition: "transform 200ms ease, border-color 200ms ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.borderColor = `${card.accentColor}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--color-border)";
            }}
          >
            <div className="badge">{card.badge}</div>
            <h3
              style={{
                marginTop: "0.75rem",
                fontSize: "1.08rem",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                marginTop: "0.35rem",
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
              }}
            >
              {card.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
