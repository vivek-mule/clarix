import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiTarget,
  FiBookOpen,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import { saveOnboarding } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";

const STEPS = [
  { label: "Focus Area", icon: FiTarget, desc: "What you want to learn" },
  { label: "Learning Style", icon: FiBookOpen, desc: "How you learn best" },
  { label: "Experience", icon: FiTrendingUp, desc: "Your current level" },
];

const STYLES = [
  { id: "visual", label: "Visual Learner", desc: "Diagrams, spatial metaphors, structured visuals and graphics.", icon: "👁️", accent: "#6366f1" },
  { id: "auditory", label: "Auditory Learner", desc: "Conversational explanations, mnemonics, rhythm and flow.", icon: "🎧", accent: "#a855f7" },
  { id: "reading", label: "Reading/Writing", desc: "Definitions, bullet points, well-organized written content.", icon: "📖", accent: "#06b6d4" },
  { id: "kinesthetic", label: "Kinesthetic Learner", desc: "Hands-on examples, experiments, interactive exercises.", icon: "🔧", accent: "#10b981" },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "New to most topics. I need to start from the fundamentals.", icon: "🌱", accent: "#10b981" },
  { id: "intermediate", label: "Intermediate", desc: "I know the basics and want to build deeper understanding.", icon: "📈", accent: "#6366f1" },
  { id: "advanced", label: "Advanced", desc: "I'm comfortable with concepts, looking for nuance and challenge.", icon: "🚀", accent: "#a855f7" },
];

const FOCUSES = [
  { id: "core", label: "Core Concepts", desc: "Fundamentals, definitions, and first principles.", icon: "🎯", accent: "#6366f1" },
  { id: "problem_solving", label: "Problem Solving", desc: "Application-oriented, stepwise solution building.", icon: "🧩", accent: "#a855f7" },
  { id: "applications", label: "Real-World Applications", desc: "Practical examples, case studies, and intuition.", icon: "⚡", accent: "#f59e0b" },
  { id: "exam_prep", label: "Exam Preparation", desc: "Speed, pattern recognition, and targeted practice.", icon: "📝", accent: "#06b6d4" },
];

/* ── Card Option ── */
function CardOption({ selected, title, desc, onClick, icon, accent }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        width: "100%",
        borderRadius: "var(--radius-lg)",
        border: selected ? `1.5px solid ${accent}50` : "1px solid var(--color-border)",
        padding: "1rem 1.1rem",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        transition: "all 220ms ease",
        background: selected ? `${accent}08` : "rgba(14, 14, 18, 0.6)",
        boxShadow: selected ? `0 0 20px ${accent}08` : "none",
        display: "flex",
        gap: "0.8rem",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--color-border-strong)";
          e.currentTarget.style.background = "rgba(22,22,28,0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.background = "rgba(14, 14, 18, 0.6)";
        }
      }}
    >
      {/* Accent glow when selected */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "8rem",
            height: "8rem",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}06, transparent 65%)`,
            transform: "translate(40%, -40%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          fontSize: "1.35rem",
          lineHeight: 1,
          width: "2.4rem",
          height: "2.4rem",
          borderRadius: "0.55rem",
          display: "grid",
          placeItems: "center",
          background: selected ? `${accent}15` : "rgba(255,255,255,0.03)",
          border: `1px solid ${selected ? `${accent}25` : "var(--color-border)"}`,
          flexShrink: 0,
          transition: "all 200ms ease",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)" }}>{title}</div>
        <div style={{ marginTop: "0.15rem", fontSize: "0.76rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
          {desc}
        </div>
      </div>
      {selected && (
        <div
          style={{
            width: "1.3rem",
            height: "1.3rem",
            borderRadius: "50%",
            background: accent,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${accent}30`,
          }}
        >
          <FiCheck size={10} color="#fff" />
        </div>
      )}
    </motion.button>
  );
}

/* ════════════════════ ONBOARDING ════════════════════ */
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
      const knowledge_levels = { [focusHint]: { level: experienceLevel } };
      await saveOnboarding({ learning_style: learningStyle, knowledge_levels, learning_path: [] });
      await refreshProfile();
      nav("/dashboard");
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Onboarding failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ paddingTop: "1.5rem", paddingBottom: "2rem", maxWidth: "620px", margin: "0 auto" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          background: "rgba(14,14,18,0.85)",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
        }}
      >
        {/* Accent line */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, var(--color-primary), var(--color-secondary), transparent)" }} />

        {/* Header */}
        <div
          style={{
            padding: "1.75rem 1.75rem 1.35rem",
            borderBottom: "1px solid var(--color-border)",
            background: "linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "1.4rem", height: "1.4rem", borderRadius: "0.35rem", display: "grid", placeItems: "center", background: "var(--color-primary-glow)", color: "var(--color-primary-light)" }}>
              <FiZap size={10} />
            </div>
            <span className="section-kicker">Setup</span>
          </div>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--color-text)",
              fontFamily: "var(--font-display)",
            }}
          >
            Configure your <span className="gradient-text">learning profile</span>
          </h1>
          <p style={{ marginTop: "0.3rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            These preferences set your initial experience. The AI will continuously adapt as you learn.
          </p>

          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0.35rem", marginTop: "1.15rem" }}>
            {STEPS.map((s, idx) => {
              const isActive = idx + 1 === step;
              const isDone = idx + 1 < step;
              return (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.55rem 0.65rem",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${isActive ? "rgba(99,102,241,0.25)" : isDone ? "rgba(16,185,129,0.18)" : "var(--color-border)"}`,
                    background: isActive ? "rgba(99,102,241,0.06)" : isDone ? "rgba(16,185,129,0.04)" : "transparent",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: isActive ? "var(--color-primary-light)" : isDone ? "var(--color-accent)" : "var(--color-text-dim)",
                    transition: "all 250ms ease",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      width: "1.15rem",
                      height: "1.15rem",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: isDone ? "var(--color-accent)" : isActive ? "var(--color-primary)" : "rgba(255,255,255,0.05)",
                      color: isDone || isActive ? "#fff" : "var(--color-text-dim)",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? <FiCheck size={8} /> : idx + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: "0.85rem", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && (
                <>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.2rem" }}>
                    Choose your focus area
                  </h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                    This seeds your initial baseline so diagnostics are more relevant.
                  </p>
                  <div style={{ display: "grid", gap: "0.45rem", gridTemplateColumns: "1fr 1fr" }}>
                    {FOCUSES.map((f) => (
                      <CardOption
                        key={f.id}
                        selected={focusHint === f.id}
                        title={f.label}
                        desc={f.desc}
                        icon={f.icon}
                        accent={f.accent}
                        onClick={() => setFocusHint(f.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.2rem" }}>
                    How do you learn best?
                  </h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                    The tutor will adapt its explanation style to your preference.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {STYLES.map((s) => (
                      <CardOption
                        key={s.id}
                        selected={learningStyle === s.id}
                        title={s.label}
                        desc={s.desc}
                        icon={s.icon}
                        accent={s.accent}
                        onClick={() => setLearningStyle(s.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.2rem" }}>
                    Your experience level
                  </h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                    Sets starting difficulty before the diagnostic assessment refines it.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {LEVELS.map((l) => (
                      <CardOption
                        key={l.id}
                        selected={experienceLevel === l.id}
                        title={l.label}
                        desc={l.desc}
                        icon={l.icon}
                        accent={l.accent}
                        onClick={() => setExperienceLevel(l.id)}
                      />
                    ))}
                  </div>
                  {error && (
                    <div
                      style={{
                        marginTop: "0.85rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        background: "var(--color-danger-soft)",
                        padding: "0.65rem 0.85rem",
                        fontSize: "0.8rem",
                        color: "var(--color-danger)",
                      }}
                    >
                      {error}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={onBack}
              disabled={step === 1 || saving}
              className="btn-secondary"
              style={{
                opacity: step === 1 ? 0.35 : 1,
                cursor: step === 1 ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
              }}
            >
              <FiArrowLeft size={14} /> Back
            </button>

            {step < 3 ? (
              <button type="button" onClick={onNext} className="btn-primary" style={{ fontSize: "0.82rem" }}>
                Continue <FiArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                disabled={saving}
                className="btn-primary"
                style={{ opacity: saving ? 0.6 : 1, fontSize: "0.82rem" }}
              >
                {saving ? (
                  <>
                    <span className="spinner" /> Saving...
                  </>
                ) : (
                  <>
                    <FiCheck size={14} /> Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
