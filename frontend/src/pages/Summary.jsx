import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiArrowLeft,
  FiBookOpen,
  FiMap,
  FiFile,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import { getDocumentDetail, generateDocumentSummary } from "../lib/api.js";

/* ── Dagre layout helper ── */
const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

function layoutGraph(rawNodes, rawEdges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 50 });

  rawNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  rawEdges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  const nodes = rawNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      data: { label: n.label, description: n.description || "" },
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      type: "roadmapNode",
      style: { width: NODE_WIDTH },
    };
  });

  const edges = rawEdges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    animated: true,
    type: "smoothstep",
    style: { stroke: "rgba(99,102,241,0.6)", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "rgba(99,102,241,0.6)",
      width: 16,
      height: 16,
    },
  }));

  return { nodes, edges };
}

/* ── Custom Node Component with Handles ── */
function RoadmapNode({ data }) {
  return (
    <>
      {/* Target handle (top — edges connect INTO this node here) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: "rgba(99,102,241,0.6)",
          border: "2px solid rgba(99,102,241,0.8)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          padding: "0.7rem 0.85rem",
          borderRadius: "0.6rem",
          border: "1px solid rgba(99,102,241,0.25)",
          background: "rgba(14,14,18,0.95)",
          backdropFilter: "blur(8px)",
          cursor: "default",
          transition: "border-color 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: data.description ? "0.2rem" : 0,
            lineHeight: 1.3,
          }}
        >
          {data.label}
        </div>
        {data.description && (
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--color-text-muted)",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {data.description}
          </div>
        )}
      </div>
      {/* Source handle (bottom — edges go OUT from this node here) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: "rgba(99,102,241,0.6)",
          border: "2px solid rgba(99,102,241,0.8)",
          borderRadius: "50%",
        }}
      />
    </>
  );
}

const nodeTypes = { roadmapNode: RoadmapNode };

/* ── Toggle tabs ── */
const TABS = [
  { id: "summary", label: "Summary", icon: FiBookOpen },
  { id: "roadmap", label: "Roadmap", icon: FiMap },
];

/* ════════════════════ SUMMARY PAGE ════════════════════ */
export default function Summary() {
  const { docId } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  /* ── Fetch document ── */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getDocumentDetail(docId)
      .then((d) => { if (mounted) setDoc(d); })
      .catch((e) => { if (mounted) setError(e?.response?.data?.detail || e?.message || "Failed to load document"); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [docId]);

  /* ── Regenerate summary ── */
  const onRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const updated = await generateDocumentSummary(docId);
      setDoc(updated);
    } catch (e) {
      setError(e?.response?.data?.detail || "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }, [docId]);

  /* ── Roadmap layout ── */
  const { layoutNodes, layoutEdges } = useMemo(() => {
    const roadmap = doc?.roadmap;
    if (!roadmap?.nodes?.length) return { layoutNodes: [], layoutEdges: [] };
    const { nodes, edges } = layoutGraph(roadmap.nodes, roadmap.edges || []);
    return { layoutNodes: nodes, layoutEdges: edges };
  }, [doc?.roadmap]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (layoutNodes.length) {
      setNodes(layoutNodes);
      setEdges(layoutEdges);
    }
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  /* ── Loading ── */
  if (loading) {
    return (
      <section style={{ paddingTop: "3rem", textAlign: "center" }}>
        <div className="spinner" style={{ width: "1.5rem", height: "1.5rem", margin: "0 auto 0.75rem" }} />
        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Loading document…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ paddingTop: "2rem" }}>
        <div
          style={{
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(239,68,68,0.2)",
            background: "var(--color-danger-soft)",
            padding: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--color-danger)",
            textAlign: "center",
          }}
        >
          {error}
        </div>
        <button onClick={() => nav("/dashboard")} className="btn-secondary" style={{ marginTop: "1rem", fontSize: "0.82rem" }}>
          <FiArrowLeft size={14} /> Back to Dashboard
        </button>
      </section>
    );
  }

  return (
    <section style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid var(--color-border)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 50%, rgba(6,182,212,0.04) 100%)",
          padding: "1.75rem 2rem 1.5rem",
          overflow: "hidden",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ position: "absolute", top: "-3rem", right: "-2rem", width: "14rem", height: "14rem", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06), transparent 65%)", filter: "blur(30px)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", position: "relative" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <button
                onClick={() => nav("/dashboard")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                <FiArrowLeft size={12} /> Dashboard
              </button>
              <span style={{ color: "var(--color-text-dim)", fontSize: "0.7rem" }}>·</span>
              <span className="section-kicker">Document</span>
            </div>
            <h1
              style={{
                fontSize: "clamp(1.3rem, 2.2vw, 1.7rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--color-text)",
                fontFamily: "var(--font-display)",
                lineHeight: 1.2,
              }}
            >
              <FiFile size={18} style={{ verticalAlign: "middle", marginRight: "0.35rem", color: "var(--color-primary-light)" }} />
              {doc?.filename || "Document"}
            </h1>
            <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.6rem", fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
              <span>{doc?.page_count || 0} pages</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{doc?.vector_count || 0} vectors</span>
            </div>
          </div>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="btn-secondary"
            style={{ fontSize: "0.78rem", gap: "0.3rem", flexShrink: 0, opacity: regenerating ? 0.5 : 1 }}
          >
            {regenerating ? <span className="spinner" style={{ width: "0.8rem", height: "0.8rem" }} /> : <FiRefreshCw size={13} />}
            Regenerate
          </button>
        </div>
      </motion.div>

      {/* ── Tab Toggle ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{
          display: "inline-flex",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          background: "rgba(14,14,18,0.75)",
          padding: "0.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1.1rem",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "all 200ms ease",
                background: isActive
                  ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))"
                  : "transparent",
                color: isActive ? "var(--color-primary-light)" : "var(--color-text-dim)",
                boxShadow: isActive ? "0 2px 10px rgba(99,102,241,0.08)" : "none",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* ── Content (animated switch) ── */}
      <AnimatePresence mode="wait">
        {activeTab === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
              background: "rgba(14,14,18,0.75)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.2rem",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(18,18,24,0.4)",
              }}
            >
              <div style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.4rem", display: "grid", placeItems: "center", background: "var(--color-primary-glow)", color: "var(--color-primary-light)" }}>
                <FiBookOpen size={13} />
              </div>
              <h2 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text)" }}>
                Document Summary
              </h2>
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {doc?.summary ? (
                <div
                  className="markdown-body"
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--color-text)",
                    lineHeight: 1.7,
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {doc.summary}
                  </ReactMarkdown>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                    No summary generated yet.
                  </p>
                  <button onClick={onRegenerate} disabled={regenerating} className="btn-primary" style={{ fontSize: "0.8rem" }}>
                    <FiZap size={13} /> Generate Summary
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "roadmap" && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
              background: "rgba(14,14,18,0.75)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.2rem",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(18,18,24,0.4)",
              }}
            >
              <div style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.4rem", display: "grid", placeItems: "center", background: "var(--color-secondary-glow)", color: "var(--color-secondary)" }}>
                <FiMap size={13} />
              </div>
              <h2 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text)" }}>
                Learning Roadmap
              </h2>
            </div>
            <div style={{ height: "550px", background: "rgba(8,8,12,0.6)" }}>
              {nodes.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  proOptions={{ hideAttribution: true }}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Background color="rgba(255,255,255,0.03)" gap={20} />
                  <Controls
                    style={{
                      borderRadius: "0.5rem",
                      border: "1px solid var(--color-border)",
                      background: "rgba(14,14,18,0.9)",
                      overflow: "hidden",
                    }}
                  />
                  <MiniMap
                    nodeColor="rgba(99,102,241,0.4)"
                    maskColor="rgba(0,0,0,0.7)"
                    style={{
                      borderRadius: "0.5rem",
                      border: "1px solid var(--color-border)",
                      background: "rgba(14,14,18,0.9)",
                    }}
                  />
                </ReactFlow>
              ) : (
                <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                      No roadmap generated yet.
                    </p>
                    <button onClick={onRegenerate} disabled={regenerating} className="btn-primary" style={{ fontSize: "0.8rem" }}>
                      <FiZap size={13} /> Generate Roadmap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
