import { useState } from "react";

const COLORS = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceLight: "#1a2332",
  border: "#1e2d3d",
  borderActive: "#2dd4bf",
  text: "#e2e8f0",
  textMuted: "#64748b",
  textDim: "#475569",
  accent: "#2dd4bf",
  accentDim: "rgba(45, 212, 191, 0.15)",
  laneA: "#3b82f6",
  laneADim: "rgba(59, 130, 246, 0.12)",
  laneB: "#f59e0b",
  laneBDim: "rgba(245, 158, 11, 0.12)",
  approved: "#22c55e",
  approvedDim: "rgba(34, 197, 94, 0.12)",
  hold: "#ef4444",
  holdDim: "rgba(239, 68, 68, 0.12)",
  pending: "#a78bfa",
  pendingDim: "rgba(167, 139, 250, 0.12)",
  security: "#f43f5e",
  securityDim: "rgba(244, 63, 94, 0.12)",
};

const StatusBadge = ({ status }) => {
  const config = {
    active: { bg: COLORS.approvedDim, color: COLORS.approved, label: "ACTIVE", pulse: true },
    approved: { bg: COLORS.approvedDim, color: COLORS.approved, label: "APPROVED" },
    queued: { bg: COLORS.pendingDim, color: COLORS.pending, label: "QUEUED" },
    hold: { bg: COLORS.holdDim, color: COLORS.hold, label: "ON HOLD" },
    blocking: { bg: COLORS.securityDim, color: COLORS.security, label: "BLOCKING" },
    designing: { bg: COLORS.accentDim, color: COLORS.accent, label: "DESIGNING" },
    locked: { bg: COLORS.approvedDim, color: COLORS.approved, label: "LOCKED" },
  };
  const c = config[status] || config.queued;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color, fontSize: 9, fontWeight: 700,
      letterSpacing: 1.2, padding: "3px 8px", borderRadius: 4,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {c.pulse && <span style={{
        width: 6, height: 6, borderRadius: "50%", background: c.color,
        animation: "pulse 2s infinite",
      }} />}
      {c.label}
    </span>
  );
};

const SectionCard = ({ title, icon, children, accentColor = COLORS.accent }) => (
  <div style={{
    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 10, overflow: "hidden",
    borderLeft: `3px solid ${accentColor}`,
  }}>
    <div style={{
      padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        fontWeight: 700, color: accentColor, letterSpacing: 0.8,
        textTransform: "uppercase",
      }}>{title}</span>
    </div>
    <div style={{ padding: "14px 18px" }}>{children}</div>
  </div>
);

const FlowNode = ({ label, sub, status, lane, onClick, active }) => {
  const laneColor = lane === "A" ? COLORS.laneA : lane === "B" ? COLORS.laneB : COLORS.accent;
  return (
    <div onClick={onClick} style={{
      background: active ? COLORS.surfaceLight : COLORS.surface,
      border: `1px solid ${active ? laneColor : COLORS.border}`,
      borderRadius: 8, padding: "10px 14px", cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s", position: "relative",
      boxShadow: active ? `0 0 20px ${laneColor}22` : "none",
    }}>
      {lane && (
        <span style={{
          position: "absolute", top: -8, right: 10, fontSize: 8,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
          background: lane === "A" ? COLORS.laneADim : COLORS.laneBDim,
          color: laneColor, padding: "2px 6px", borderRadius: 3,
          letterSpacing: 1,
        }}>LANE {lane}</span>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{label}</span>
        {status && <StatusBadge status={status} />}
      </div>
      {sub && <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
};

const Arrow = ({ direction = "down", label, color = COLORS.textDim }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 0" }}>
    {label && <span style={{ fontSize: 8, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5, marginBottom: 2 }}>{label}</span>}
    <svg width="16" height="16" viewBox="0 0 16 16">
      {direction === "down" && <path d="M8 2 L8 12 M4 9 L8 13 L12 9" stroke={color} strokeWidth="1.5" fill="none" />}
      {direction === "right" && <path d="M2 8 L12 8 M9 4 L13 8 L9 12" stroke={color} strokeWidth="1.5" fill="none" />}
    </svg>
  </div>
);

const ConnectorLine = ({ color = COLORS.border }) => (
  <div style={{ width: 1, height: 12, background: color, margin: "0 auto" }} />
);

export default function CouncilFlowchart() {
  const [selectedExp, setSelectedExp] = useState(null);

  const experiments = [
    { id: 1, name: "Risk-Level Router Bakeoff", duration: "48h", status: "active", gate: "Zero Level-2 misroutes", owner: "CL2 harness · CL5 red-team", prompts: "180 (70 L0 / 60 L1 / 50 L2)" },
    { id: 2, name: "Handoff Contract Stress Test", duration: "2 days", status: "active", gate: "0 unauthorized bypasses, ≤5% wrong-specialist", owner: "CL2 harness · CL5 adversarial vectors", prompts: "120 (60 valid / 40 ambiguous / 20 adversarial)" },
    { id: 3, name: "Adversarial Guardrail Benchmark", duration: "3 days", status: "queued", gate: "Any parallel pre-cancel execution → blocking permanently", owner: "CL5 adversarial corpus", prompts: "150 (normal + jailbreak + confused-deputy)" },
    { id: 4, name: "Replay-Safe Mutation Drill", duration: "TBD", status: "queued", gate: "0 duplicate side effects across 45 fault injections", owner: "Joint CL2/CL5", prompts: "3 workflows × 5 injection points × 3 runs" },
    { id: 5, name: "Financial Analyst Pipeline", duration: "—", status: "hold", gate: "Architecture validated first", owner: "CL5 planner · CL4 executor · CL2 validator", prompts: "—" },
  ];

  return (
    <div style={{
      background: COLORS.bg, minHeight: "100vh", padding: "24px 16px",
      fontFamily: "'Inter', -apple-system, sans-serif", color: COLORS.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: COLORS.accent, letterSpacing: 2, marginBottom: 6,
          textTransform: "uppercase",
        }}>OpenClaw Council · Day 1</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
          Architecture & Roadmap
        </h1>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>
          2026-02-27 · CL2 + CL5 active · Experiments running
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Standing Architecture */}
        <SectionCard title="Adopted Architecture" icon="🏗" accentColor={COLORS.accent}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FlowNode label="Bi-Modal Orchestration Standard" sub="Lane A (Agents SDK) + Lane B (LangGraph) — formally adopted" status="locked" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FlowNode label="Lane A — Adaptive" sub="Triage, routing, read-only ops, exploratory tasks" lane="A" />
              <FlowNode label="Lane B — Assured" sub="Durable execution, HITL approval, irreversible actions" lane="B" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: COLORS.approvedDim, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: COLORS.approved, fontWeight: 700 }}>LEVEL 0</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Read-only</div>
                <div style={{ fontSize: 8, color: COLORS.textDim }}>Autonomous</div>
              </div>
              <div style={{ background: COLORS.laneBDim, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: COLORS.laneB, fontWeight: 700 }}>LEVEL 1</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Reversible writes</div>
                <div style={{ fontSize: 8, color: COLORS.textDim }}>Blocking guardrails</div>
              </div>
              <div style={{ background: COLORS.securityDim, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: COLORS.security, fontWeight: 700 }}>LEVEL 2</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Irreversible / external</div>
                <div style={{ fontSize: 8, color: COLORS.textDim }}>HITL mandatory</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
              {["Swarm: RETIRED", "n8n: OUT OF SCOPE", "No trace = no deploy", "MCP for tool defs"].map(p => (
                <span key={p} style={{
                  fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.textMuted, background: COLORS.surfaceLight,
                  padding: "3px 8px", borderRadius: 4,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </SectionCard>

        <Arrow direction="down" label="VALIDATING VIA" />

        {/* Experiments */}
        <SectionCard title="Experiments Pipeline" icon="🧪" accentColor={COLORS.laneA}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {experiments.map((exp, i) => (
              <div key={exp.id}>
                <FlowNode
                  label={`E${exp.id}: ${exp.name}`}
                  sub={selectedExp === exp.id
                    ? `Duration: ${exp.duration} · Gate: ${exp.gate} · Owner: ${exp.owner} · Corpus: ${exp.prompts}`
                    : `${exp.duration} · ${exp.gate}`
                  }
                  status={exp.status}
                  onClick={() => setSelectedExp(selectedExp === exp.id ? null : exp.id)}
                  active={selectedExp === exp.id}
                />
                {i < 3 && <ConnectorLine color={exp.status === "active" ? COLORS.approved : COLORS.border} />}
                {i === 3 && <div style={{ borderTop: `1px dashed ${COLORS.border}`, margin: "6px 0" }} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.approved }} /> E1+E2 parallel
            </div>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.pending }} /> E3→E4 sequential
            </div>
          </div>
        </SectionCard>

        <Arrow direction="down" label="IN PARALLEL" />

        {/* Research Tracks */}
        <SectionCard title="Active Research Tracks" icon="🔬" accentColor={COLORS.pending}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FlowNode
              label="AMC Framework Analysis"
              sub="Map L0–L5 maturity against our risk tiers. Evaluate evidence ledger, SIMULATE→EXECUTE governor, probationary mode."
              status="approved"
            />
            <FlowNode
              label="Snyk Security Assessment"
              sub="Credential leak vectors mapped to our stack. BLOCKING — no new skills until delivered."
              status="blocking"
            />
          </div>
          <ConnectorLine />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FlowNode
              label="D3: Research Ops Hub"
              sub="Entity-Claim Graph, source decay, triage scoring, actionable digests"
              status="approved"
            />
            <FlowNode
              label="D4: Memory Executive Assistant"
              sub="Session node tree, SOTU gating, serendipity index, sqlite-vec migration"
              status="approved"
            />
          </div>
        </SectionCard>

        <Arrow direction="down" label="FEEDS INTO" />

        {/* Use Cases */}
        <SectionCard title="Use Cases — Discovered & Pending" icon="🎯" accentColor={COLORS.laneB}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <FlowNode label="UC1: Research Ops Hub" sub="Continuous source monitoring, contradiction detection, scored digests" status="designing" />
            <FlowNode label="UC2: Memory-Driven Executive Assistant" sub="Cross-channel context, preference learning, privacy-first local memory" status="designing" />
            <FlowNode label="UC3: Autonomous Incident Responder" sub="Lane A watches CVE feeds → Lane B drafts & applies patches with HITL" status="approved" />
            <div style={{
              border: `1px dashed ${COLORS.border}`, borderRadius: 8,
              padding: "10px 14px", textAlign: "center",
            }}>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                3–4 more use cases needed — discovery ongoing
              </span>
            </div>
          </div>
        </SectionCard>

        <Arrow direction="down" label="ENABLING" />

        {/* Nightmode */}
        <SectionCard title="Nightmode Protocol" icon="🌙" accentColor="#8b5cf6">
          <FlowNode
            label='"nightmode activated"'
            sub="Formalized overnight autonomous sprint. Structured research cycles, source monitoring, infra healthchecks. Morning digest with prioritized actions to Telegram."
            status="designing"
          />
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            {[
              { icon: "🔄", label: "Research\nSprints" },
              { icon: "📡", label: "Source\nMonitoring" },
              { icon: "🛡", label: "Infra\nHealthcheck" },
              { icon: "📋", label: "Morning\nDigest" },
            ].map(item => (
              <div key={item.label} style={{
                background: COLORS.surfaceLight, borderRadius: 6, padding: "8px 6px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 16 }}>{item.icon}</div>
                <div style={{ fontSize: 8, color: COLORS.textMuted, marginTop: 3, whiteSpace: "pre-line", lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Ownership */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4,
        }}>
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: COLORS.laneA, fontWeight: 700, marginBottom: 8 }}>CL2 — BUILDER</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
              Experiment harnesses<br/>
              Pass/fail scorecards<br/>
              Risk taxonomy compliance<br/>
              Architecture validation
            </div>
          </div>
          <div style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: COLORS.laneB, fontWeight: 700, marginBottom: 8 }}>CL5 — BREAKER</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
              Adversarial prompt generation<br/>
              Red-team reporting<br/>
              Counterexample hunting<br/>
              Deep-dive architecture specs
            </div>
          </div>
        </div>

        {/* Security Gate */}
        <div style={{
          background: COLORS.securityDim, border: `1px solid ${COLORS.security}33`,
          borderRadius: 10, padding: "14px 18px", marginTop: 4,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>⛔</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.security }}>
              SKILL INSTALLATION BLOCKED
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, lineHeight: 1.4 }}>
              Proactive Agent · Self-improving Agent · Browser Use · Agent Browser
              <br />
              Awaiting Snyk security assessment + mitigation plan from CL2/CL5
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 9, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
          Click any experiment card for details · Last updated 2026-02-27
        </div>
      </div>
    </div>
  );
}
