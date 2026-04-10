import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveOnboarding } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";

const STEPS = ["Focus", "Learning style", "Experience level"];

const STYLES = [
  { id: "visual", label: "Visual", desc: "Diagrams, spatial metaphors, structured visuals." },
  { id: "auditory", label: "Auditory", desc: "Conversational explanations, mnemonics, rhythm." },
  { id: "reading", label: "Reading/Writing", desc: "Definitions, bullet points, clear structure." },
  { id: "kinesthetic", label: "Kinesthetic", desc: "Real-world examples, experiments, interactive thinking." },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "I’m new to most of these topics." },
  { id: "intermediate", label: "Intermediate", desc: "I know fundamentals and want to build depth." },
  { id: "advanced", label: "Advanced", desc: "I’m comfortable and want harder problems + nuance." },
];

function CardOption({ selected, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
        selected
          ? "border-cyan-500/60 bg-cyan-100 shadow-sm"
          : "border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-soft)]"
      }`}
    >
      <div className="font-semibold text-[var(--color-text)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--color-text-muted)]">{desc}</div>
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
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Configure your adaptive learning profile</h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              These choices set your initial learning behavior. The agents will keep refining this as you progress.
            </p>
          </div>
          <div className="badge">
            Step {step} / {STEPS.length}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {STEPS.map((name, idx) => {
            const isActive = idx + 1 === step;
            const isDone = idx + 1 < step;
            return (
              <div
                key={name}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  isActive
                    ? "border-cyan-500/60 bg-cyan-100 text-cyan-900"
                    : isDone
                    ? "border-emerald-400/60 bg-emerald-100 text-emerald-900"
                    : "border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
                }`}
              >
                {idx + 1}. {name}
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-600" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="mt-6 surface-card-soft p-6 sm:p-7">
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold">Choose your current focus</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                This seeds your initial baseline so the first diagnostic is more relevant.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <CardOption
                  selected={focusHint === "core"}
                  title="Core concepts"
                  desc="Fundamentals, principles, and definitions."
                  onClick={() => setFocusHint("core")}
                />
                <CardOption
                  selected={focusHint === "problem_solving"}
                  title="Problem solving"
                  desc="Application-oriented, stepwise solution building."
                  onClick={() => setFocusHint("problem_solving")}
                />
                <CardOption
                  selected={focusHint === "applications"}
                  title="Applications"
                  desc="Real-world context, examples, and intuition."
                  onClick={() => setFocusHint("applications")}
                />
                <CardOption
                  selected={focusHint === "exam_prep"}
                  title="Exam prep"
                  desc="Speed, patterns, and accuracy for assessments."
                  onClick={() => setFocusHint("exam_prep")}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold">How do you absorb information best?</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                The tutor will adapt tone, framing, and explanation style to this preference.
              </p>
              <div className="mt-5 grid gap-3">
                {STYLES.map((s) => (
                  <CardOption
                    key={s.id}
                    selected={learningStyle === s.id}
                    title={s.label}
                    desc={s.desc}
                    onClick={() => setLearningStyle(s.id)}
                  />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-semibold">Set your starting level</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">
                This defines your initial module difficulty before personalized diagnostics kick in.
              </p>
              <div className="mt-5 grid gap-3">
                {LEVELS.map((l) => (
                  <CardOption
                    key={l.id}
                    selected={experienceLevel === l.id}
                    title={l.label}
                    desc={l.desc}
                    onClick={() => setExperienceLevel(l.id)}
                  />
                ))}
              </div>

              {error && <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              disabled={step === 1 || saving}
              className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>

            {step < 3 ? (
              <button type="button" onClick={onNext} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                Next
              </button>
            ) : (
              <button type="button" onClick={onFinish} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                {saving ? "Saving..." : "Finish onboarding"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

