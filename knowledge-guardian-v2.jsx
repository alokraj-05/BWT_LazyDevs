import { useState, useRef, useEffect, useCallback } from "react";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const EXTRACT_PROMPT = `You are an AI that extracts structured institutional knowledge from raw documents or communications.

Given this raw text from a document labeled "{SOURCE_NAME}", extract ALL key knowledge items as JSON:

{
  "knowledge_items": [
    {
      "type": "decision|process|technical_fact|best_practice|warning|contact",
      "title": "short descriptive title",
      "summary": "1-2 sentence summary",
      "details": "full context with all relevant information",
      "actors": ["people or teams involved"],
      "confidence": 0.0-1.0
    }
  ]
}

Return ONLY valid JSON. Be thorough - extract every important decision, process, technical detail, warning, and contact/ownership information.

Document text:
{TEXT}`;

const SYSTEM_PROMPT = `You are an Institutional Knowledge Guardian AI assistant. You help employees surface organizational knowledge captured from company documents and communications.

You have access to the following knowledge base:

<knowledge_base>
{KNOWLEDGE}
</knowledge_base>

Rules:
1. Ground ALL answers in the knowledge base above
2. Always cite which document/source each piece of information came from
3. If something isn't in the knowledge base, say clearly: "I don't have information about that yet."
4. Highlight WARNINGS or critical caveats prominently
5. Be concise but complete
6. If multiple sources mention the same topic, synthesize them`;

const TYPE_STYLES = {
  decision:      { accent: "#f97316", label: "DECISION",      icon: "⚖️" },
  process:       { accent: "#38bdf8", label: "PROCESS",       icon: "🔄" },
  technical_fact:{ accent: "#4ade80", label: "TECH FACT",     icon: "⚙️" },
  best_practice: { accent: "#a78bfa", label: "BEST PRACTICE", icon: "✅" },
  warning:       { accent: "#fb7185", label: "WARNING",        icon: "⚠️" },
  contact:       { accent: "#fbbf24", label: "CONTACT",        icon: "👤" },
};

function FileDropZone({ onFilesAdded, processing }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesAdded(files);
  }, [onFilesAdded]);

  const handleChange = (e) => {
    onFilesAdded(Array.from(e.target.files));
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !processing && inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#f97316" : "#2a2a3a"}`,
        borderRadius: 14,
        padding: "40px 24px",
        textAlign: "center",
        cursor: processing ? "not-allowed" : "pointer",
        background: dragging ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize: "32px 32px", pointerEvents: "none"
      }} />
      <div style={{ fontSize: 36, marginBottom: 12 }}>
        {processing ? "⟳" : dragging ? "📂" : "📁"}
      </div>
      <div style={{ fontSize: 14, color: "#e0e0e0", marginBottom: 6, fontWeight: "bold" }}>
        {processing ? "Processing document..." : dragging ? "Drop it!" : "Drop your documents here"}
      </div>
      <div style={{ fontSize: 11, color: "#555" }}>
        Supports .txt, .md, .pdf, .json, .csv, .js, .py, or any text file
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.md,.pdf,.json,.csv,.js,.ts,.py,.html,.xml,.log"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 4 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "#555",
          display: "inline-block",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState("capture");
  const [sources, setSources] = useState([]);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingName, setProcessingName] = useState("");
  const [chat, setChat] = useState([{
    role: "assistant",
    content: "👋 I'm your Knowledge Guardian. Upload documents in the CAPTURE tab, and I'll learn from them. Then ask me anything about your organization's decisions, processes, or technical context."
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const processFile = async (file) => {
    setProcessing(true);
    setProcessingName(file.name);

    try {
      const text = await readFileAsText(file);
      const truncated = text.slice(0, 12000);

      const prompt = EXTRACT_PROMPT
        .replace("{SOURCE_NAME}", file.name)
        .replace("{TEXT}", truncated);

      const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      let clean = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        const lastComplete = clean.lastIndexOf("},");
        if (lastComplete > 0) {
          clean = clean.slice(0, lastComplete + 1) + "\n  ]\n}";
        }
        parsed = JSON.parse(clean);
      }
      const items = (parsed.knowledge_items || []).map(item => ({
        ...item,
        id: Math.random().toString(36).slice(2),
        sourceName: file.name,
        sourceSize: file.size,
        capturedAt: new Date().toLocaleTimeString()
      }));

      setSources(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        type: file.type,
        itemCount: items.length,
        capturedAt: new Date().toLocaleTimeString()
      }]);

      setKnowledgeBase(prev => [...prev, ...items]);
    } catch (err) {
      console.error("Error processing file:", err);
      setSources(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        name: file.name,
        error: true,
        errorMsg: err.message || "Unknown error",
        capturedAt: new Date().toLocaleTimeString()
      }]);
    }

    setProcessing(false);
    setProcessingName("");
  };

  const handleFilesAdded = async (files) => {
    for (const file of files) {
      await processFile(file);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChat(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    const knowledgeSummary = knowledgeBase.length > 0
      ? knowledgeBase.map(item =>
          `[Source: ${item.sourceName}] ${item.type.toUpperCase()}: ${item.title}\n${item.details}`
        ).join("\n\n---\n\n")
      : "No documents have been uploaded yet.";

    const systemPrompt = SYSTEM_PROMPT.replace("{KNOWLEDGE}", knowledgeSummary);
    const history = chat.slice(1).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...history, { role: "user", content: userMsg }]
        })
      });
      const data = await res.json();
      const reply = data.content.map(b => b.text || "").join("");
      setChat(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChat(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
    setChatLoading(false);
  };

  const filteredKnowledge = knowledgeBase.filter(item =>
    !searchQuery ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes) => bytes < 1024 ? `${bytes}B` : `${(bytes/1024).toFixed(1)}KB`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      color: "#d4d4d8",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d0d18; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .card:hover { border-color: #2a2a3a !important; }
        textarea:focus, input:focus { outline: none; }
      `}</style>

      {/* Scanline effect */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "100%", height: "2px",
          background: "linear-gradient(transparent, rgba(249,115,22,0.04), transparent)",
          animation: "scanline 8s linear infinite"
        }} />
      </div>

      {/* Header */}
      <header style={{
        padding: "16px 28px",
        borderBottom: "1px solid #14141f",
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "linear-gradient(180deg, #0e0e1a 0%, #080810 100%)",
        position: "sticky", top: 0, zIndex: 50
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #f97316, #fb923c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
          boxShadow: "0 0 20px rgba(249,115,22,0.3)"
        }}>🧠</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>
            Knowledge Guardian
          </div>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: 3, textTransform: "uppercase" }}>
            Institutional Memory System
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {processing && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.3)", borderRadius: 6, fontSize: 10, color: "#f97316"
            }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              Learning from {processingName}
            </div>
          )}
          <Stat label="DOCS" value={sources.filter(s=>!s.error).length} color="#38bdf8" />
          <Stat label="KNOWLEDGE ITEMS" value={knowledgeBase.length} color="#f97316" />
        </div>
      </header>

      {/* Tabs */}
      <nav style={{
        display: "flex", padding: "0 28px",
        borderBottom: "1px solid #14141f",
        background: "#0a0a14"
      }}>
        {[
          { id: "capture", icon: "⬇", label: "Capture" },
          { id: "knowledge", icon: "🗂", label: `Knowledge Base${knowledgeBase.length ? ` (${knowledgeBase.length})` : ""}` },
          { id: "chat", icon: "💬", label: "Ask AI" }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "14px 20px",
            background: "none", border: "none",
            borderBottom: tab === t.id ? "2px solid #f97316" : "2px solid transparent",
            color: tab === t.id ? "#f97316" : "#444",
            cursor: "pointer", fontSize: 11, letterSpacing: 1.5,
            fontFamily: "'IBM Plex Mono', monospace",
            transition: "color 0.2s"
          }}>{t.icon} {t.label.toUpperCase()}</button>
        ))}
      </nav>

      <main style={{ padding: "28px", maxWidth: 900, margin: "0 auto" }}>

        {/* CAPTURE TAB */}
        {tab === "capture" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionHeader
              title="Document Ingestion"
              sub="Upload any text document — meeting notes, emails, wikis, code files, transcripts"
            />
            <FileDropZone onFilesAdded={handleFilesAdded} processing={processing} />

            {sources.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 14 }}>INDEXED DOCUMENTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sources.map(src => (
                    <div key={src.id} className="card" style={{
                      padding: "14px 18px", background: "#0d0d18",
                      border: "1px solid #14141f", borderRadius: 10,
                      display: "flex", alignItems: "center", gap: 14, transition: "border-color 0.2s"
                    }}>
                      <div style={{ fontSize: 22 }}>{src.error ? "❌" : getFileIcon(src.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#e0e0e0", fontWeight: 600 }}>{src.name}</div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                          {src.error ? `Failed: ${src.errorMsg || "Unknown error"}` : `${src.itemCount} knowledge items extracted · ${formatSize(src.size)} · ${src.capturedAt}`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, letterSpacing: 1, padding: "3px 10px", borderRadius: 4,
                        background: src.error ? "rgba(251,113,133,0.1)" : "rgba(74,222,128,0.1)",
                        color: src.error ? "#fb7185" : "#4ade80",
                        border: `1px solid ${src.error ? "rgba(251,113,133,0.2)" : "rgba(74,222,128,0.2)"}`
                      }}>
                        {src.error ? "ERROR" : "✓ INDEXED"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sources.length === 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 14 }}>WHAT YOU CAN UPLOAD</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "📋", label: "Meeting transcripts", ex: "Zoom/Meet export .txt" },
                    { icon: "💬", label: "Chat exports", ex: "Slack JSON or copy-paste" },
                    { icon: "📧", label: "Email threads", ex: "Copy as .txt file" },
                    { icon: "📄", label: "Wiki / Confluence docs", ex: ".md or .txt export" },
                    { icon: "🐛", label: "Incident reports", ex: "Post-mortems, runbooks" },
                    { icon: "💻", label: "Code + comments", ex: ".js, .py, .ts files" },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: "12px 16px", background: "#0d0d18",
                      border: "1px solid #14141f", borderRadius: 8,
                      display: "flex", gap: 12, alignItems: "center"
                    }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: "#888" }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: "#333" }}>{item.ex}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {tab === "knowledge" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <SectionHeader
                title="Structured Knowledge Base"
                sub="AI-extracted decisions, processes, and technical context from your documents"
              />
              {knowledgeBase.length > 0 && (
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  style={{
                    padding: "8px 14px", background: "#0d0d18",
                    border: "1px solid #1e1e2e", borderRadius: 8,
                    color: "#e0e0e0", fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace", width: 200
                  }}
                />
              )}
            </div>

            {knowledgeBase.length === 0 ? (
              <Empty icon="🗂" title="No knowledge captured yet" sub="Upload documents in the CAPTURE tab" />
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {Object.entries(TYPE_STYLES).map(([type, s]) => {
                    const count = knowledgeBase.filter(i => i.type === type).length;
                    if (count === 0) return null;
                    return (
                      <button key={type} onClick={() => setSearchQuery(searchQuery === type ? "" : type)} style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 10, cursor: "pointer",
                        fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5,
                        background: searchQuery === type ? s.accent + "22" : "#0d0d18",
                        border: `1px solid ${searchQuery === type ? s.accent : "#1e1e2e"}`,
                        color: searchQuery === type ? s.accent : "#555"
                      }}>{s.icon} {s.label} ({count})</button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredKnowledge.map(item => {
                    const s = TYPE_STYLES[item.type] || TYPE_STYLES.technical_fact;
                    return (
                      <div key={item.id} className="card" style={{
                        padding: "16px 18px", background: "#0d0d18",
                        border: "1px solid #14141f", borderLeft: `3px solid ${s.accent}`,
                        borderRadius: 10, transition: "border-color 0.2s", animation: "fadeIn 0.3s ease"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{
                              fontSize: 9, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 3,
                              background: s.accent + "18", color: s.accent
                            }}>{s.icon} {s.label}</span>
                            {item.confidence >= 0.8 && (
                              <span style={{ fontSize: 9, color: "#4ade80", letterSpacing: 1 }}>HIGH CONFIDENCE</span>
                            )}
                          </div>
                          <span style={{ fontSize: 9, color: "#333" }}>📁 {item.sourceName}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#f0f0f0", fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.8, marginBottom: item.actors?.length ? 10 : 0 }}>{item.details}</div>
                        {item.actors && item.actors.filter(Boolean).length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {item.actors.filter(Boolean).map(a => (
                              <span key={a} style={{ fontSize: 9, padding: "2px 8px", background: "#14141f", borderRadius: 20, color: "#555" }}>👤 {a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredKnowledge.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "#333", fontSize: 12 }}>No results for "{searchQuery}"</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}>
            <SectionHeader
              title="Ask Your Knowledge Guardian"
              sub={knowledgeBase.length > 0 ? `Answering from ${knowledgeBase.length} knowledge items across ${sources.length} document(s)` : "Upload documents first to enable AI answers"}
            />

            {knowledgeBase.length > 0 && chat.length <= 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  "Summarize all the key decisions captured",
                  "What processes should I know about?",
                  "Are there any warnings or critical issues?",
                  "Who are the key people mentioned?"
                ].map(q => (
                  <button key={q} onClick={() => setChatInput(q)} style={{
                    padding: "6px 14px", background: "#0d0d18",
                    border: "1px solid #1e1e2e", borderRadius: 20,
                    color: "#666", cursor: "pointer", fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s"
                  }}>{q}</button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {chat.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, marginRight: 10, flexShrink: 0,
                      background: "linear-gradient(135deg, #f97316, #fb923c)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
                    }}>🧠</div>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "linear-gradient(135deg, #f97316, #ea580c)" : "#0d0d18",
                    border: msg.role === "assistant" ? "1px solid #14141f" : "none",
                    fontSize: 12, lineHeight: 1.8, color: "#e0e0e0", whiteSpace: "pre-wrap"
                  }}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, marginRight: 10,
                    background: "linear-gradient(135deg, #f97316, #fb923c)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
                  }}>🧠</div>
                  <div style={{
                    padding: "12px 16px", background: "#0d0d18",
                    border: "1px solid #14141f", borderRadius: "14px 14px 14px 4px",
                    fontSize: 11, color: "#555", display: "flex", alignItems: "center"
                  }}>
                    Searching knowledge base <TypingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                placeholder={knowledgeBase.length === 0 ? "Upload documents first..." : "Ask about any decision, process, or technical context..."}
                disabled={chatLoading || knowledgeBase.length === 0}
                style={{
                  flex: 1, padding: "13px 18px", background: "#0d0d18",
                  border: "1px solid #1e1e2e", borderRadius: 10,
                  color: "#e0e0e0", fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace", transition: "border-color 0.2s"
                }}
              />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim() || knowledgeBase.length === 0} style={{
                padding: "13px 22px",
                background: chatLoading || !chatInput.trim() || knowledgeBase.length === 0
                  ? "#14141f"
                  : "linear-gradient(135deg, #f97316, #ea580c)",
                border: "none", borderRadius: 10,
                color: "#fff", cursor: "pointer", fontSize: 16, transition: "all 0.2s"
              }}>→</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: "6px 14px", background: "#0d0d18", border: "1px solid #14141f", borderRadius: 6, textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: "bold", color, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 8, color: "#444", letterSpacing: 1.5 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, color: "#f0f0f0", fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#444" }}>{sub}</div>
    </div>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#333" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = { pdf: "📕", md: "📝", txt: "📄", json: "📊", csv: "📊", js: "💻", ts: "💻", py: "🐍", html: "🌐", log: "📋", xml: "📋" };
  return icons[ext] || "📄";
}
