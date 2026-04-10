import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  FiArrowRight,
  FiZap,
  FiTarget,
  FiCpu,
  FiBookOpen,
  FiBarChart2,
  FiShield,
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheck,
  FiGitBranch,
  FiDatabase,
  FiMessageSquare,
} from "react-icons/fi";

/* ── Animation Variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ── Animated Section Wrapper ── */
function AnimatedSection({ children, className = "", style = {} }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Feature Card ── */
function FeatureCard({ icon: Icon, title, desc, color, delay }) {
  return (
    <motion.div variants={fadeUp} custom={delay}>
      <div
        style={{
          padding: "1.5rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          background: "rgba(14, 14, 18, 0.6)",
          transition: "all 250ms ease",
          cursor: "default",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${color}33`;
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = `0 12px 40px ${color}15`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            width: "2.4rem",
            height: "2.4rem",
            borderRadius: "0.6rem",
            display: "grid",
            placeItems: "center",
            background: `${color}15`,
            color: color,
            marginBottom: "1rem",
          }}
        >
          <Icon size={20} />
        </div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.4rem" }}>
          {title}
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Step Card ── */
function StepCard({ num, title, desc, delay }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "rgba(14, 14, 18, 0.5)",
        transition: "background 200ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(22, 22, 28, 0.7)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(14, 14, 18, 0.5)"; }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          minWidth: "2rem",
          height: "2rem",
          borderRadius: "0.5rem",
          background: "var(--color-primary)",
          fontSize: "0.8rem",
          fontWeight: 800,
          color: "#fff",
        }}
      >
        {num}
      </span>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text)" }}>{title}</div>
        <p style={{ marginTop: "0.2rem", fontSize: "0.82rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Auth Input ── */
function AuthInput({ label, icon: Icon, error, showPassword, onTogglePassword, ...props }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "0.35rem" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <div
            style={{
              position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
              color: "var(--color-text-dim)", pointerEvents: "none", display: "flex",
            }}
          >
            <Icon size={16} />
          </div>
        )}
        <input
          {...props}
          style={{
            width: "100%",
            padding: `0.65rem ${onTogglePassword ? "2.5rem" : "0.85rem"} 0.65rem ${Icon ? "2.4rem" : "0.85rem"}`,
            background: error ? "rgba(239, 68, 68, 0.05)" : "rgba(14, 14, 18, 0.8)",
            border: error ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text)",
            fontSize: "0.88rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "all 200ms ease",
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = "var(--color-primary)";
              e.target.style.boxShadow = "0 0 0 3px var(--color-ring)";
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = "var(--color-border-strong)";
              e.target.style.boxShadow = "none";
            }
            props.onBlur?.(e);
          }}
        />
        {onTogglePassword && (
          <button
            type="button" onClick={onTogglePassword}
            style={{
              position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
              color: "var(--color-text-dim)", background: "none", border: "none", cursor: "pointer",
              display: "flex", padding: "0.2rem",
            }}
          >
            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem", color: "var(--color-danger)", fontSize: "0.75rem", fontWeight: 500 }}
          >
            <FiAlertCircle size={12} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════ LANDING PAGE ═══════════════════ */
export default function Landing() {
  const nav = useNavigate();
  const { isAuthenticated, profile, login, register, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const authRef = useRef(null);

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create account"), [mode]);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const validateFields = () => {
    const errors = {};
    if (!form.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6) errors.password = "Min 6 characters";
    if (mode === "signup" && !form.name) errors.name = "Name is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateFields()) return;

    try {
      let authRes;
      if (mode === "login") {
        authRes = await login({ email: form.email, password: form.password });
      } else {
        authRes = await register({ email: form.email, password: form.password, name: form.name });
      }
      const next = authRes?.profile?.onboarding_complete ? "/dashboard" : "/onboarding";
      nav(next);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Authentication failed");
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError(null);
    setFieldErrors({});
    setForm({ email: "", password: "", name: "" });
  };

  const features = [
    { icon: FiCpu, title: "Multi-Agent AI", desc: "Five specialized agents orchestrated by LangGraph collaborate to create your personalized learning experience.", color: "#6366f1" },
    { icon: FiTarget, title: "Adaptive Assessment", desc: "Semantic evaluation understands meaning, not just keywords. Your mastery is measured accurately.", color: "#a855f7" },
    { icon: FiZap, title: "Real-Time Streaming", desc: "Token-by-token response streaming delivers instant, interactive tutoring sessions.", color: "#06b6d4" },
    { icon: FiBookOpen, title: "RAG-Grounded Content", desc: "Every explanation is anchored to your course materials via vector similarity search.", color: "#10b981" },
    { icon: FiBarChart2, title: "Mastery Tracking", desc: "Continuous progress monitoring drives you forward through difficulty tiers automatically.", color: "#f59e0b" },
    { icon: FiShield, title: "Secure & Private", desc: "JWT authentication with row-level security ensures your data stays yours.", color: "#ef4444" },
  ];

  const steps = [
    { num: "1", title: "Diagnose your baseline", desc: "The assessment agent creates a diagnostic quiz to understand your current knowledge level across topics." },
    { num: "2", title: "Build your curriculum", desc: "A personalized learning path is generated with prerequisite ordering and progressive difficulty." },
    { num: "3", title: "Learn with RAG context", desc: "The tutor retrieves relevant course content and adapts explanations to your preferred learning style." },
    { num: "4", title: "Verify mastery", desc: "Take quizzes graded semantically. Score above threshold and advance — or get targeted remediation." },
  ];

  const techStack = [
    { icon: FiGitBranch, label: "LangGraph", desc: "Agent Orchestration" },
    { icon: FiCpu, label: "Gemini 2.5 Pro", desc: "Language Model" },
    { icon: FiDatabase, label: "Pinecone", desc: "Vector Database" },
    { icon: FiMessageSquare, label: "SSE Streaming", desc: "Real-time Delivery" },
  ];

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh" }}>
      {/* ── Sticky Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <nav
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0.6rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(9, 9, 11, 0.8)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                display: "grid", height: "1.7rem", width: "1.7rem", placeItems: "center",
                borderRadius: "0.45rem", background: "var(--color-primary)",
                fontWeight: 800, fontSize: "0.75rem", color: "#fff",
              }}
            >
              C
            </span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text)", fontFamily: "var(--font-display)" }}>
              Clarix
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {isAuthenticated ? (
              <button onClick={() => nav("/dashboard")} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}>
                Go to Dashboard <FiArrowRight size={14} />
              </button>
            ) : (
              <>
                <button onClick={scrollToAuth} className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem" }}>
                  Sign in
                </button>
                <button onClick={() => { setMode("signup"); scrollToAuth(); }} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero Section ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "5rem 1.5rem 4rem",
          maxWidth: "1280px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Gradient orbs */}
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "36rem", height: "36rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-5%", right: "-8%", width: "30rem", height: "30rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 60%)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "0", left: "50%", transform: "translateX(-50%)", width: "40rem", height: "20rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)", filter: "blur(50px)", pointerEvents: "none" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} style={{ position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "999px", border: "1px solid rgba(99,102,241,0.2)", padding: "0.3rem 0.85rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-primary-light)", background: "var(--color-primary-glow)", marginBottom: "1.5rem", letterSpacing: "0.03em" }}
          >
            <FiZap size={12} /> AI-Powered Adaptive Learning
          </motion.div>

          {/* Headline */}
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", maxWidth: "48rem", margin: "0 auto" }}>
            Learn smarter with{" "}
            <span className="gradient-text">AI that adapts</span>{" "}
            to you
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ marginTop: "1.25rem", fontSize: "1.08rem", color: "var(--color-text-muted)", maxWidth: "38rem", margin: "1.25rem auto 0", lineHeight: 1.7 }}
          >
            Clarix uses multi-agent AI to diagnose your knowledge, build personalized curricula, and deliver
            real-time tutoring grounded in your course materials.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            style={{ marginTop: "2rem", display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}
          >
            {isAuthenticated ? (
              <button onClick={() => nav("/dashboard")} className="btn-primary" style={{ padding: "0.7rem 1.5rem", fontSize: "0.95rem" }}>
                Go to Dashboard <FiArrowRight size={16} />
              </button>
            ) : (
              <>
                <button onClick={() => { setMode("signup"); scrollToAuth(); }} className="btn-primary" style={{ padding: "0.7rem 1.5rem", fontSize: "0.95rem" }}>
                  Get Started Free <FiArrowRight size={16} />
                </button>
                <button onClick={scrollToAuth} className="btn-secondary" style={{ padding: "0.7rem 1.5rem", fontSize: "0.95rem" }}>
                  Sign In
                </button>
              </>
            )}
          </motion.div>

          {/* Tech stack badges */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginTop: "3rem", display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}
          >
            {techStack.map((t) => (
              <div
                key={t.label}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.35rem 0.7rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", background: "rgba(14,14,18,0.6)",
                  fontSize: "0.72rem", color: "var(--color-text-muted)",
                }}
              >
                <t.icon size={12} style={{ color: "var(--color-primary-light)" }} />
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{t.label}</span>
                <span>·</span>
                <span>{t.desc}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features Section ── */}
      <section style={{ padding: "3rem 1.5rem 4rem", maxWidth: "1280px", margin: "0 auto" }}>
        <AnimatedSection>
          <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="section-kicker">Features</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.85rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)", marginTop: "0.5rem" }}>
              Everything you need to learn effectively
            </h2>
            <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", color: "var(--color-text-muted)", maxWidth: "32rem", margin: "0.5rem auto 0" }}>
              An intelligent pipeline that personalizes every step of your learning journey.
            </p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i} />
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: "3rem 1.5rem 4rem", maxWidth: "1280px", margin: "0 auto" }}>
        <AnimatedSection>
          <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="section-kicker">How It Works</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.85rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-text)", marginTop: "0.5rem" }}>
              Four steps to mastery
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem", maxWidth: "56rem", margin: "0 auto" }}>
            {steps.map((s, i) => (
              <StepCard key={s.num} {...s} delay={i} />
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ── Auth Section ── */}
      {!isAuthenticated && (
        <section ref={authRef} id="auth" style={{ padding: "3rem 1.5rem 5rem", maxWidth: "460px", margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div
              style={{
                background: "rgba(14, 14, 18, 0.9)",
                borderRadius: "var(--radius-2xl)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
                overflow: "hidden",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Glow line */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, var(--color-primary), var(--color-secondary), transparent)" }} />

              {/* Header */}
              <div style={{ padding: "2rem 2rem 1.5rem", textAlign: "center" }}>
                <AnimatePresence mode="wait">
                  <motion.div key={mode} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>{title}</h2>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                      {mode === "login" ? "Sign in to continue learning" : "Start your learning journey"}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content */}
              <div style={{ padding: "0 2rem 2rem" }}>
                {/* Mode Toggle */}
                <div style={{ display: "flex", gap: "0.2rem", marginBottom: "1.5rem", padding: "0.2rem", borderRadius: "var(--radius-md)", background: "rgba(22, 22, 28, 0.8)", border: "1px solid var(--color-border)" }}>
                  {["login", "signup"].map((m) => (
                    <button
                      key={m} onClick={() => handleModeSwitch(m)} type="button"
                      style={{
                        flex: 1, padding: "0.55rem", borderRadius: "calc(var(--radius-md) - 2px)",
                        fontWeight: 600, fontSize: "0.82rem", fontFamily: "var(--font-body)",
                        border: "none", cursor: "pointer", transition: "all 200ms ease",
                        background: mode === m ? "var(--color-primary)" : "transparent",
                        color: mode === m ? "#fff" : "var(--color-text-muted)",
                      }}
                    >
                      {m === "login" ? "Sign In" : "Register"}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode} onSubmit={onSubmit}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                  >
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "var(--color-danger-soft)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-md)", padding: "0.65rem 0.85rem" }}
                        >
                          <FiAlertCircle style={{ color: "var(--color-danger)", flexShrink: 0 }} size={15} />
                          <p style={{ color: "var(--color-danger)", fontSize: "0.8rem", fontWeight: 500 }}>{error}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {mode === "signup" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <AuthInput label="Full Name" icon={FiUser} type="text" value={form.name}
                            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFieldErrors((p) => ({ ...p, name: "" })); }}
                            placeholder="John Doe" error={fieldErrors.name}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AuthInput label="Email" icon={FiMail} type="email" value={form.email}
                      onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); setFieldErrors((p) => ({ ...p, email: "" })); }}
                      placeholder="you@example.com" error={fieldErrors.email}
                    />

                    <AuthInput label="Password" icon={FiLock} type={showPassword ? "text" : "password"} value={form.password}
                      onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setFieldErrors((p) => ({ ...p, password: "" })); }}
                      placeholder="Min 6 characters" error={fieldErrors.password}
                      showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)}
                    />

                    <button
                      type="submit" disabled={loading}
                      style={{
                        width: "100%", marginTop: "0.5rem", padding: "0.7rem",
                        borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: "0.88rem",
                        fontFamily: "var(--font-body)", border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                        transition: "all 200ms ease",
                        background: loading ? "rgba(99,102,241,0.3)" : "var(--color-primary)",
                        color: loading ? "var(--color-text-dim)" : "#fff",
                        boxShadow: loading ? "none" : "0 4px 16px rgba(99,102,241,0.25)",
                      }}
                    >
                      {loading ? <><span className="spinner" /> Processing...</> : (
                        <>{mode === "login" ? <><FiArrowRight size={16} /> Sign In</> : <><FiCheck size={16} /> Create Account</>}</>
                      )}
                    </button>
                  </motion.form>
                </AnimatePresence>

                <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: "1.25rem" }}>
                  {mode === "login" ? "New here? " : "Already have an account? "}
                  <button
                    type="button" onClick={() => handleModeSwitch(mode === "login" ? "signup" : "login")}
                    style={{ fontWeight: 600, color: "var(--color-primary-light)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", fontFamily: "inherit" }}
                  >
                    {mode === "login" ? "Create account" : "Sign in"}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
          <span style={{ display: "grid", height: "1.2rem", width: "1.2rem", placeItems: "center", borderRadius: "0.3rem", background: "var(--color-primary)", fontWeight: 800, fontSize: "0.55rem", color: "#fff" }}>C</span>
          <span style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Clarix</span>
          <span>·</span>
          <span>AI-Powered Adaptive Learning</span>
        </div>
      </footer>
    </div>
  );
}
