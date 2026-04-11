import { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUploadCloud,
  FiCheck,
  FiFile,
  FiArrowRight,
  FiZap,
  FiBookOpen,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { uploadPdf } from "../lib/api.js";

/* ── Step Data ── */
const STEPS = [
  { label: "Welcome", icon: FiZap },
  { label: "Upload PDF", icon: FiUploadCloud },
  { label: "Processing", icon: FiLoader },
  { label: "Complete", icon: FiCheck },
];

/* ════════════════════ SETUP PAGE ════════════════════ */
export default function Setup() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  /* ── File handling ── */
  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only .pdf files are supported");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File too large (max 20MB)");
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer?.files?.[0];
      handleFile(f);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onFileInput = useCallback(
    (e) => {
      handleFile(e.target.files?.[0]);
    },
    [handleFile]
  );

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  /* ── Upload ── */
  const startUpload = async () => {
    if (!file) return;
    setStep(2);
    setUploading(true);
    setError(null);
    setProgress("Uploading PDF…");

    try {
      setProgress("Extracting text & embedding pages…");
      const res = await uploadPdf(file);
      setResult(res);
      setProgress("Done!");
      setStep(3);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "Upload failed");
      setStep(1); // go back to upload step
    } finally {
      setUploading(false);
    }
  };

  return (
    <section style={{ paddingTop: "1.5rem", paddingBottom: "2rem", maxWidth: "640px", margin: "0 auto" }}>
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
            <span className="section-kicker">New Setup</span>
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
            Upload your <span className="gradient-text">study material</span>
          </h1>
          <p style={{ marginTop: "0.3rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
            Upload a PDF document to generate a summary and learning roadmap powered by AI.
          </p>

          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0.35rem", marginTop: "1.15rem" }}>
            {STEPS.map((s, idx) => {
              const isActive = idx === step;
              const isDone = idx < step;
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
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
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

        {/* Content */}
        <div style={{ padding: "1.5rem 1.75rem 1.75rem" }}>
          <AnimatePresence mode="wait">
            {/* ── Step 0: Welcome ── */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div
                    style={{
                      width: "4rem",
                      height: "4rem",
                      borderRadius: "1rem",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--color-primary-glow)",
                      margin: "0 auto 1rem",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    <FiBookOpen size={24} style={{ color: "var(--color-primary-light)" }} />
                  </div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.4rem" }}>
                    Ready to get started?
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", maxWidth: "28rem", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
                    Upload a PDF document and Clarix will automatically:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "22rem", margin: "0 auto 1.5rem", textAlign: "left" }}>
                    {[
                      { icon: "📄", text: "Extract and index content from your PDF" },
                      { icon: "🧠", text: "Generate an AI-powered summary" },
                      { icon: "🗺️", text: "Create a branched learning roadmap" },
                    ].map((item) => (
                      <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", background: "rgba(22,22,28,0.5)", border: "1px solid var(--color-border)" }}>
                        <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                        <span style={{ fontSize: "0.82rem", color: "var(--color-text)" }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStep(1)} className="btn-primary" style={{ fontSize: "0.85rem", gap: "0.35rem" }}>
                    Let's go <FiArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: File Upload ── */}
            {step === 1 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.2rem" }}>
                  Upload your PDF
                </h2>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                  Drag and drop or click to select. Maximum file size: 20MB.
                </p>

                {/* Drop zone */}
                {!file ? (
                  <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => inputRef.current?.click()}
                    style={{
                      position: "relative",
                      borderRadius: "var(--radius-lg)",
                      border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                      background: dragOver ? "rgba(99,102,241,0.06)" : "rgba(22,22,28,0.4)",
                      padding: "3rem 1.5rem",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 220ms ease",
                    }}
                  >
                    <div
                      style={{
                        width: "3.5rem",
                        height: "3.5rem",
                        borderRadius: "0.8rem",
                        display: "grid",
                        placeItems: "center",
                        background: "var(--color-primary-glow)",
                        margin: "0 auto 0.75rem",
                        border: "1px solid rgba(99,102,241,0.15)",
                      }}
                    >
                      <FiUploadCloud size={22} style={{ color: "var(--color-primary-light)" }} />
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)", marginBottom: "0.25rem" }}>
                      {dragOver ? "Drop your file here" : "Click to upload or drag & drop"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                      PDF only · Max 20MB
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".pdf"
                      onChange={onFileInput}
                      style={{ display: "none" }}
                    />
                  </div>
                ) : (
                  /* Selected file preview */
                  <div
                    style={{
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      background: "rgba(16,185,129,0.04)",
                      padding: "1rem 1.15rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        borderRadius: "0.55rem",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(16,185,129,0.12)",
                        flexShrink: 0,
                      }}
                    >
                      <FiFile size={18} style={{ color: "var(--color-accent)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-dim)", marginTop: "0.1rem" }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      style={{
                        width: "1.6rem",
                        height: "1.6rem",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-dim)",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                )}

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

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button
                    onClick={startUpload}
                    disabled={!file || uploading}
                    className="btn-primary"
                    style={{ fontSize: "0.82rem", opacity: !file ? 0.5 : 1, cursor: !file ? "not-allowed" : "pointer" }}
                  >
                    Upload & Process <FiArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Processing ── */}
            {step === 2 && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
                  <div className="spinner" style={{ width: "2rem", height: "2rem", margin: "0 auto 1rem" }} />
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.3rem" }}>
                    Processing your document
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "0.8rem" }}>
                    {progress}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxWidth: "18rem", margin: "0 auto" }}>
                    {["Uploading PDF…", "Extracting text & embedding pages…", "Generating summary & roadmap…"].map((label) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.75rem",
                          color: progress === label ? "var(--color-primary-light)" : "var(--color-text-dim)",
                          fontWeight: progress === label ? 600 : 400,
                        }}
                      >
                        {progress === label ? (
                          <span className="spinner" style={{ width: "0.75rem", height: "0.75rem" }} />
                        ) : (
                          <FiCheck size={12} style={{ opacity: 0.3 }} />
                        )}
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Complete ── */}
            {step === 3 && result && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div
                    style={{
                      width: "3.5rem",
                      height: "3.5rem",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--color-accent)",
                      margin: "0 auto 0.85rem",
                      boxShadow: "0 4px 20px rgba(16,185,129,0.25)",
                    }}
                  >
                    <FiCheck size={22} color="#fff" />
                  </div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.3rem" }}>
                    Upload complete!
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
                    Your document has been processed and added to your knowledge base.
                  </p>

                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
                    {[
                      { label: "Pages", value: result.page_count },
                      { label: "Vectors", value: result.vector_count },
                      { label: "File", value: result.filename?.slice(0, 15) + (result.filename?.length > 15 ? "…" : "") },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          padding: "0.65rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-border)",
                          background: "rgba(22,22,28,0.5)",
                        }}
                      >
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text)", fontFamily: "var(--font-display)" }}>{s.value}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--color-text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.1rem" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <button
                      onClick={() => nav(`/summary/${result.id}`)}
                      className="btn-primary"
                      style={{ fontSize: "0.82rem", gap: "0.35rem" }}
                    >
                      View Summary & Roadmap <FiArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => nav("/dashboard")}
                      className="btn-secondary"
                      style={{ fontSize: "0.82rem" }}
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
