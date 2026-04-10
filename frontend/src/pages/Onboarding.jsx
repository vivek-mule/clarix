import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveOnboarding } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";

const STEPS = ["Focus", "Learning style", "Experience level"];

const STYLES = [
  { id: "visual", label: "Visual", desc: "Diagrams, spatial metaphors, structured visuals.", icon: "👁️" },
  { id: "auditory", label: "Auditory", desc: "Conversational explanations, mnemonics, rhythm.", icon: "🎧" },
  { id: "reading", label: "Reading/Writing", desc: "Definitions, bullet points, clear structure.", icon: "📖" },
  { id: "kinesthetic", label: "Kinesthetic", desc: "Real-world examples, experiments, interactive thinking.", icon: "🔧" },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "I'm new to most of these topics.", icon: "🌱" },
  { id: "intermediate", label: "Intermediate", desc: "I know fundamentals and want to build depth.", icon: "📈" },
  { id: "advanced", label: "Advanced", desc: "I'm comfortable and want harder problems + nuance.", icon: "🚀" },
];

function CardOption({ selected, title, desc, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: "var(--radius-xl)",
        border: selected
          ? "1.5px solid rgba(0, 212, 255, 0.4)"
          : "1px solid var(--color-border)",
        padding: "1.15rem 1.25rem",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        background: selected
          ? "linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.03))"
          : "var(--color-surface-soft)",
        boxShadow: selected
          ? "0 0 20px rgba(0, 212, 255, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)"
          : "none",
        transform: selected ? "scale(1.01)" : "scale(1)",
        display: "flex",
        gap: "0.85rem",
        alignItems: "flex-start",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "rgba(99, 115, 160, 0.35)";
          e.currentTarget.style.background = "rgba(20, 28, 55, 0.8)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.background = "var(--color-surface-soft)";
        }
      }}
    >
      {icon && (
        <span style={{ fontSize: "1.3rem", lineHeight: 1, marginTop: "0.1rem" }}>{icon}</span>
      )}
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text)" }}>
          {title}
        </div>
        <div style={{ marginTop: "0.25rem", fontSize: "0.83rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
      {selected && (
        <span
          style={{
            marginLeft: "auto",
            display: "grid",
            placeItems: "center",
            width: "1.4rem",
            height: "1.4rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-primary), #0090cc)",
            fontSize: "0.7rem",
            color: "#fff",
            flexShrink: 0,
            marginTop: "0.15rem",
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

export default function Onboarding() {
  const nav = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [learningStyle, setLearningStyle] = useState("reading");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [focusHint, setFocusHint] = useState("core");

  const progressPct = useMemo(() => Math.round((step / 3) * 100), [step]);

  const onNext = () => setStep((s) => Math.min(3, s + 1));
  const onBack = () => setStep((s) => Math.max(1, s - 1));

  const onFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      // Backend expects knowledge_levels dict; we seed a coarse baseline.
      const knowledge_levels = { [focusHint]: { level: experienceLevel } };
      await saveOnboarding({
        learning_style: learningStyle,
        knowledge_levels,
        learning_path: [],
      });
      await refreshProfile();
      nav("/dashboard");
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Onboarding failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-8 md:py-10 fade-in">
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="section-kicker">Profile setup</span>
            <h1
              style={{
                marginTop: "0.5rem",
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
              }}
            >
              Configure your adaptive learning profile
            </h1>
            <p style={{ marginTop: "0.5rem", fontSize: "0.88rem", color: "var(--color-text-muted)" }}>
              These choices set your initial learning behavior. The agents will keep refining this as you progress.
            </p>
          </div>
          <div className="badge">
            Step {step} / {STEPS.length}
          </div>
        </div>

        {/* Step indicators */}
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {STEPS.map((name, idx) => {
            const isActive = idx + 1 === step;
            const isDone = idx + 1 < step;
            return (
              <div
                key={name}
                style={{
                  borderRadius: "var(--radius-xl)",
                  border: isActive
                    ? "1.5px solid rgba(0, 212, 255, 0.4)"
                    : isDone
                    ? "1px solid rgba(0, 232, 157, 0.3)"
                    : "1px solid var(--color-border)",
                  padding: "0.8rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: isActive
                    ? "var(--color-primary)"
                    : isDone
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                  background: isActive
                    ? "var(--color-primary-glow)"
                    : isDone
                    ? "var(--color-accent-glow)"
                    : "var(--color-surface-soft)",
                  transition: "all 300ms ease",
                }}
              >
                {isDone ? "✓ " : ""}{idx + 1}. {name}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="mt-5"
          style={{
            height: "0.35rem",
            width: "100%",
            overflow: "hidden",
            borderRadius: "999px",
            background: "rgba(20, 28, 55, 0.6)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
              borderRadius: "999px",
              width: `${progressPct}%`,
              transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)",
            }}
          />
        </div>

        {/* Step content */}
        <div
          className="mt-6 surface-card-soft"
          style={{ padding: "1.5rem 1.6rem" }}
        >
          {step === 1 && (
            <>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-text)" }}>
                Choose your current focus
              </h2>
              <p style={{ marginTop: "0.5rem", color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
                This seeds your initial baseline so the first diagnostic is more relevant.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <CardOption
                  selected={focusHint === "core"}
                  title="Core concepts"
                  desc="Fundamentals, principles, and definitions."
                  icon="🎯"
                  onClick={() => setFocusHint("core")}
                />
                <CardOption
                  selected={focusHint === "problem_solving"}
                  title="Problem solving"
                  desc="Application-oriented, stepwise solution building."
                  icon="🧩"
                  onClick={() => setFocusHint("problem_solving")}
                />
                <CardOption
                  selected={focusHint === "applications"}
                  title="Applications"
                  desc="Real-world context, examples, and intuition."
                  icon="⚡"
                  onClick={() => setFocusHint("applications")}
                />
                <CardOption
                  selected={focusHint === "exam_prep"}
                  title="Exam prep"
                  desc="Speed, patterns, and accuracy for assessments."
                  icon="📝"
                  onClick={() => setFocusHint("exam_prep")}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-text)" }}>
                How do you absorb information best?
              </h2>
              <p style={{ marginTop: "0.5rem", color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
                The tutor will adapt tone, framing, and explanation style to this preference.
              </p>
              <div className="mt-5 grid gap-3">
                {STYLES.map((s) => (
                  <CardOption
                    key={s.id}
                    selected={learningStyle === s.id}
                    title={s.label}
                    desc={s.desc}
                    icon={s.icon}
                    onClick={() => setLearningStyle(s.id)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-text)" }}>
                Set your starting level
              </h2>
              <p style={{ marginTop: "0.5rem", color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
                This defines your initial module difficulty before personalized diagnostics kick in.
              </p>
              <div className="mt-5 grid gap-3">
                {LEVELS.map((l) => (
                  <CardOption
                    key={l.id}
                    selected={experienceLevel === l.id}
                    title={l.label}
                    desc={l.desc}
                    icon={l.icon}
                    onClick={() => setExperienceLevel(l.id)}
                  />
                ))}
              </div>

              {error && (
                <div
                  className="mt-5"
                  style={{
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid rgba(255, 77, 106, 0.25)",
                    background: "var(--color-danger-soft)",
                    padding: "0.85rem 1.15rem",
                    fontSize: "0.88rem",
                    color: "var(--color-danger)",
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              disabled={step === 1 || saving}
              className="btn-secondary text-sm"
              style={{
                opacity: step === 1 || saving ? 0.5 : 1,
                cursor: step === 1 || saving ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={onNext}
                disabled={saving}
                className="btn-primary text-sm"
                style={{ opacity: saving ? 0.5 : 1 }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                disabled={saving}
                className="btn-primary text-sm"
                style={{ opacity: saving ? 0.5 : 1 }}
              >
                {saving ? "Saving..." : "Finish onboarding ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
