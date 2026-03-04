export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "UPLOAD DOCUMENTS",
      desc: "Drop any company document — meeting notes, emails, runbooks, code files, wikis. The system accepts .txt .md .pdf .docx .json .csv .js .py .html .log",
      icon: "📁",
      color: "#3182ce",
    },
    {
      number: "02",
      title: "AI EXTRACTS KNOWLEDGE",
      desc: "Llama 3.3 70B reads the document and automatically identifies decisions, processes, warnings, contacts, best practices, and technical facts.",
      icon: "🧠",
      color: "#e53e3e",
    },
    {
      number: "03",
      title: "STORED IN DATABASE",
      desc: "All extracted knowledge items are saved to PostgreSQL (Neon). Your data persists across sessions — nothing is lost on refresh.",
      icon: "🗄️",
      color: "#38a169",
    },
    {
      number: "04",
      title: "BROWSE & FILTER",
      desc: "View all knowledge items in the Knowledge tab. Filter by type, search by keyword, delete outdated items. Full control over your knowledge base.",
      icon: "🗂",
      color: "#805ad5",
    },
    {
      number: "05",
      title: "ASK ANYTHING",
      desc: "Chat with the AI in plain language. It answers only from your uploaded documents — no hallucinations, always cites the source file.",
      icon: "💬",
      color: "#d69e2e",
    },
  ];

  const types = [
    { type: "DECISION", icon: "⚖️", color: "#e53e3e", desc: "Architectural & business decisions" },
    { type: "PROCESS", icon: "🔄", color: "#3182ce", desc: "Workflows & procedures" },
    { type: "TECH FACT", icon: "⚙️", color: "#38a169", desc: "Technical details & specs" },
    { type: "BEST PRACTICE", icon: "✅", color: "#805ad5", desc: "Recommended approaches" },
    { type: "WARNING", icon: "⚠️", color: "#dd6b20", desc: "Critical caveats & gotchas" },
    { type: "CONTACT", icon: "👤", color: "#d69e2e", desc: "People, teams & ownership" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#e2e8f0", fontFamily: "'Share Tech Mono','Courier New',monospace", padding: "24px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#080810} ::-webkit-scrollbar-thumb{background:#e53e3e33;border-radius:4px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        .step-card:hover { border-color: rgba(229,62,62,0.4) !important; transform: translateY(-2px); transition: all 0.2s; }
        .type-card:hover { transform: translateY(-2px); transition: all 0.2s; }
      `}</style>

      {/* Scanline */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "100%", height: "1px", background: "linear-gradient(transparent,rgba(229,62,62,0.05),transparent)", animation: "scanline 8s linear infinite" }} />
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeIn 0.4s ease" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 3, marginBottom: 8 }}>HOW IT WORKS</div>
          <div style={{ fontSize: 10, color: "#e53e3e", letterSpacing: 4 }}>KNOWLEDGE GUARDIAN — SYSTEM OVERVIEW</div>
          <div style={{ width: 60, height: 2, background: "#e53e3e", margin: "16px auto 0" }} />
        </div>

        {/* Video Section */}
        <div style={{ marginBottom: 48, animation: "fadeIn 0.5s ease" }}>
          <div style={{ fontSize: 8, color: "#e53e3e", letterSpacing: 3, marginBottom: 12 }}>▸ SYSTEM DEMONSTRATION</div>
          <div style={{ background: "#0d0d14", border: "1px solid #e53e3e33", borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <video
              controls
              width="100%"
              style={{ display: "block", maxHeight: 480, background: "#000" }}
              poster=""
            >
              <source src="/demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div style={{ padding: "10px 16px", borderTop: "1px solid #e53e3e22", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e53e3e", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 9, color: "#555", letterSpacing: 2 }}>DEMO — KNOWLEDGE GUARDIAN WALKTHROUGH</span>
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#333", marginTop: 8, textAlign: "center", letterSpacing: 1 }}>
            Place demo.mp4 in your frontend/public/ folder to display here
          </div>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 8, color: "#e53e3e", letterSpacing: 3, marginBottom: 20 }}>▸ STEP BY STEP PROCESS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {steps.map((step, i) => (
              <div key={i} className="step-card" style={{ display: "flex", gap: 20, padding: "20px 24px", background: "#0d0d14", border: "1px solid #e53e3e18", borderLeft: `3px solid ${step.color}`, borderRadius: 10, animation: `fadeIn 0.4s ease ${i * 0.08}s both` }}>
                <div style={{ flexShrink: 0, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 28, fontWeight: 900, color: step.color, lineHeight: 1 }}>{step.number}</div>
                  <div style={{ fontSize: 24, marginTop: 6 }}>{step.icon}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 2, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.9 }}>{step.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ position: "absolute", left: 52, marginTop: 72, fontSize: 12, color: "#333" }}>↓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Flow diagram */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 8, color: "#e53e3e", letterSpacing: 3, marginBottom: 20 }}>▸ SYSTEM ARCHITECTURE</div>
          <div style={{ padding: 24, background: "#0d0d14", border: "1px solid #e53e3e22", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap", rowGap: 12 }}>
              {[
                { label: "YOUR FILE", sub: ".txt .pdf .docx etc", color: "#3182ce", icon: "📄" },
                { arrow: true },
                { label: "BACKEND", sub: "Node.js + Express", color: "#555", icon: "⚙️" },
                { arrow: true },
                { label: "GROQ AI", sub: "Llama 3.3 70B", color: "#e53e3e", icon: "🧠" },
                { arrow: true },
                { label: "POSTGRESQL", sub: "Neon Database", color: "#38a169", icon: "🗄️" },
                { arrow: true },
                { label: "YOUR DASHBOARD", sub: "React Frontend", color: "#805ad5", icon: "🖥️" },
              ].map((item, i) =>
                item.arrow ? (
                  <div key={i} style={{ fontSize: 18, color: "#333", margin: "0 8px" }}>→</div>
                ) : (
                  <div key={i} style={{ textAlign: "center", padding: "14px 16px", background: "#080810", border: `1px solid ${item.color}44`, borderRadius: 8, minWidth: 110 }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 8, color: item.color, letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 8, color: "#444" }}>{item.sub}</div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Knowledge types */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 8, color: "#e53e3e", letterSpacing: 3, marginBottom: 20 }}>▸ WHAT GETS EXTRACTED</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {types.map((t, i) => (
              <div key={i} className="type-card" style={{ padding: "16px 18px", background: "#0d0d14", border: `1px solid ${t.color}33`, borderTop: `2px solid ${t.color}`, borderRadius: 8, animation: `fadeIn 0.4s ease ${i * 0.06}s both` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, color: t.color, letterSpacing: 1, marginBottom: 6 }}>{t.type}</div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.7 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Problem statement */}
        <div style={{ padding: 28, background: "#0d0d14", border: "1px solid #e53e3e33", borderRadius: 10, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: "#e53e3e", letterSpacing: 3, marginBottom: 16 }}>▸ THE PROBLEM WE SOLVE</div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 16, color: "#fff", lineHeight: 1.8, marginBottom: 12 }}>
            When key employees leave,<br />critical knowledge walks out with them.
          </div>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.9 }}>
            Documentation is often outdated or non-existent.<br />
            Knowledge Guardian passively captures, structures, and surfaces<br />
            company knowledge in real time — so nothing is ever lost.
          </div>
        </div>

      </div>
    </div>
  );
}
