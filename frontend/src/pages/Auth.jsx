import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiUser, FiArrowRight, FiAlertCircle, FiCheck, FiEye, FiEyeOff } from "react-icons/fi";

function ModernInput({ label, icon: Icon, error, showPassword, onTogglePassword, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          marginBottom: "0.5rem",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <div
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-dim)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          style={{
            width: "100%",
            padding: "0.85rem 3rem 0.85rem 2.8rem",
            background: error
              ? "rgba(255, 77, 106, 0.06)"
              : "rgba(12, 18, 38, 0.6)",
            border: error
              ? "1.5px solid rgba(255, 77, 106, 0.4)"
              : "1.5px solid var(--color-border-strong)",
            borderRadius: "0.85rem",
            color: "var(--color-text)",
            fontSize: "0.92rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "all 250ms ease",
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = "var(--color-primary)";
              e.target.style.boxShadow = "0 0 0 3px var(--color-ring), 0 0 20px rgba(0,212,255,0.08)";
              e.target.style.background = "rgba(15, 22, 45, 0.8)";
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = "var(--color-border-strong)";
              e.target.style.boxShadow = "none";
              e.target.style.background = "rgba(12, 18, 38, 0.6)";
            }
            props.onBlur?.(e);
          }}
        />
        {onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-dim)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              transition: "color 200ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-dim)")}
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              marginTop: "0.55rem",
              color: "var(--color-danger)",
              fontSize: "0.78rem",
              fontWeight: 500,
            }}
          >
            <FiAlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Floating particle component */
function FloatingOrb({ size, x, y, color, delay }) {
  return (
    <motion.div
      animate={{
        y: [0, -20, 0],
        opacity: [0.15, 0.3, 0.15],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${parseInt(size) * 0.6}px)`,
        left: x,
        top: y,
        pointerEvents: "none",
      }}
    />
  );
}

export default function Auth() {
  const nav = useNavigate();
  const { login, register, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create account"), [mode]);
  const subtitle = useMemo(
    () => (mode === "login" ? "Sign in to continue your learning journey" : "Start learning smarter today"),
    [mode]
  );

  const validateFields = () => {
    const errors = {};
    if (!form.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6) errors.password = "Password must be at least 6 characters";
    if (mode === "signup") {
      if (!form.name) errors.name = "Full name is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateFields()) {
      return;
    }

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
      setError(err?.response?.data?.detail || err?.message || "Authentication failed. Please try again.");
    }
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError(null);
    setFieldErrors({});
    setForm({ email: "", password: "", name: "" });
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.25rem",
        overflow: "hidden",
        background: "linear-gradient(145deg, #060a16 0%, #0a0e1a 40%, #0d1228 100%)",
      }}
    >
      {/* Animated background orbs */}
      <FloatingOrb size="320px" x="-5%" y="-10%" color="rgba(0, 212, 255, 0.07)" delay={0} />
      <FloatingOrb size="280px" x="75%" y="60%" color="rgba(123, 97, 255, 0.06)" delay={2} />
      <FloatingOrb size="200px" x="60%" y="-15%" color="rgba(0, 232, 157, 0.05)" delay={4} />
      <FloatingOrb size="150px" x="10%" y="70%" color="rgba(0, 212, 255, 0.04)" delay={1} />

      {/* Grid overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(99,115,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,115,160,0.03) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 60% 55% at center, black 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at center, black 25%, transparent 75%)",
        }}
      />

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: "460px", zIndex: 10 }}
      >
        {/* Glass Card */}
        <div
          style={{
            position: "relative",
            background: "linear-gradient(165deg, rgba(15, 22, 48, 0.85) 0%, rgba(10, 16, 35, 0.9) 100%)",
            borderRadius: "1.5rem",
            border: "1px solid rgba(99, 115, 160, 0.15)",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 115, 160, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            overflow: "hidden",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Top glow line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "10%",
              right: "10%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), rgba(123, 97, 255, 0.3), transparent)",
            }}
          />

          {/* Header */}
          <div
            style={{
              position: "relative",
              padding: "2.5rem 2.25rem 2rem",
              textAlign: "center",
              borderBottom: "1px solid rgba(99, 115, 160, 0.1)",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3 }}
              >
                {/* Logo badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1.25rem",
                    padding: "0.4rem 1rem",
                    borderRadius: "999px",
                    background: "var(--color-primary-glow)",
                    border: "1px solid rgba(0, 212, 255, 0.15)",
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: "1.4rem",
                      height: "1.4rem",
                      borderRadius: "0.4rem",
                      background: "linear-gradient(135deg, var(--color-primary), #0090cc)",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    P
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Pragyantra
                  </span>
                </div>

                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.85rem",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    letterSpacing: "-0.02em",
                    marginBottom: "0.5rem",
                  }}
                >
                  {title}
                </h1>
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  }}
                >
                  {subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Content */}
          <div style={{ padding: "2rem 2.25rem 2.25rem" }}>
            {/* Mode Toggle */}
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                marginBottom: "2rem",
                padding: "0.3rem",
                borderRadius: "0.85rem",
                background: "rgba(12, 18, 38, 0.6)",
                border: "1px solid var(--color-border)",
              }}
            >
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "0.72rem 1rem",
                    borderRadius: "0.65rem",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    fontFamily: "var(--font-body)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                    background:
                      mode === m
                        ? "linear-gradient(135deg, rgba(0, 212, 255, 0.85), rgba(0, 144, 204, 0.85))"
                        : "transparent",
                    color: mode === m ? "#ffffff" : "var(--color-text-muted)",
                    boxShadow:
                      mode === m
                        ? "0 4px 16px rgba(0, 212, 255, 0.25)"
                        : "none",
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                onSubmit={onSubmit}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}
              >
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.95 }}
                      style={{
                        display: "flex",
                        gap: "0.7rem",
                        alignItems: "flex-start",
                        background: "var(--color-danger-soft)",
                        border: "1px solid rgba(255, 77, 106, 0.25)",
                        borderRadius: "0.85rem",
                        padding: "0.85rem 1rem",
                      }}
                    >
                      <FiAlertCircle style={{ color: "var(--color-danger)", flexShrink: 0, marginTop: "0.1rem" }} size={17} />
                      <p style={{ color: "var(--color-danger)", fontSize: "0.85rem", fontWeight: 500 }}>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name field (signup only) */}
                <AnimatePresence>
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ModernInput
                        label="Full Name"
                        icon={FiUser}
                        type="text"
                        value={form.name}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, name: e.target.value }));
                          setFieldErrors((p) => ({ ...p, name: "" }));
                        }}
                        placeholder="John Doe"
                        error={fieldErrors.name}
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email field */}
                <ModernInput
                  label="Email Address"
                  icon={FiMail}
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, email: e.target.value }));
                    setFieldErrors((p) => ({ ...p, email: "" }));
                  }}
                  placeholder="you@example.com"
                  error={fieldErrors.email}
                  required
                />

                {/* Password field */}
                <ModernInput
                  label="Password"
                  icon={FiLock}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, password: e.target.value }));
                    setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                  placeholder="Minimum 6 characters"
                  error={fieldErrors.password}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  required
                />

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }}
                  whileTap={{ scale: loading ? 1 : 0.985 }}
                  style={{
                    width: "100%",
                    marginTop: "0.75rem",
                    padding: "0.9rem 1.2rem",
                    borderRadius: "0.85rem",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    fontFamily: "var(--font-body)",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 300ms ease",
                    background: loading
                      ? "rgba(30, 40, 72, 0.5)"
                      : "linear-gradient(135deg, var(--color-primary), #0090cc)",
                    color: loading ? "var(--color-text-dim)" : "#ffffff",
                    boxShadow: loading
                      ? "none"
                      : "0 6px 24px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  <motion.span
                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    {loading ? "•" : mode === "login" ? <FiArrowRight size={18} /> : <FiCheck size={18} />}
                  </motion.span>
                  {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Toggle auth mode link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                textAlign: "center",
                fontSize: "0.88rem",
                color: "var(--color-text-muted)",
                marginTop: "1.75rem",
              }}
            >
              {mode === "login" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === "login" ? "signup" : "login")}
                style={{
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  transition: "color 200ms ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#33dfff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </motion.p>
          </div>
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          style={{ marginTop: "2rem", textAlign: "center" }}
        >
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-dim)", marginBottom: "0.85rem" }}>
            Trusted by thousands of learners worldwide
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.25rem",
              fontSize: "0.78rem",
              color: "var(--color-text-dim)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "var(--color-primary)" }}>🔒</span>
              256-bit SSL
            </span>
            <span
              style={{
                width: "1px",
                height: "1rem",
                background: "var(--color-border-strong)",
              }}
            />
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ color: "var(--color-accent)" }}>✓</span>
              GDPR Safe
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
