import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";

const TYPE_STYLES = {
  decision:       { accent: "#f97316", label: "DECISION",      icon: "⚖️" },
  process:        { accent: "#38bdf8", label: "PROCESS",       icon: "🔄" },
  technical_fact: { accent: "#4ade80", label: "TECH FACT",     icon: "⚙️" },
  best_practice:  { accent: "#a78bfa", label: "BEST PRACTICE", icon: "✅" },
  warning:        { accent: "#fb7185", label: "WARNING",       icon: "⚠️" },
  contact:        { accent: "#fbbf24", label: "CONTACT",       icon: "👤" },
};

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 4 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "#555",
          display: "inline-block", animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </span>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("capture");
  const [documents, setDocuments] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingName, setProcessingName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [chat, setChat] = useState([{
    role: "assistant",
    content: `👋 Hi ${user?.name?.split(" ")[0] || "there"}! I'm your Knowledge Guardian. Upload documents in the CAPTURE tab, then ask me anything about your organization's knowledge.`
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const loadData = async () => {
    const [docs, items] = await Promise.all([api.getDocuments(), api.getKnowledge()]);
    if (!docs.error) setDocuments(docs);
    if (!items.error) setKnowledgeItems(items);
  };

  const loadKnowledge = async () => {
    const items = await api.getKnowledge(searchQuery, typeFilter);
    if (!items.error) setKnowledgeItems(items);
  };

  useEffect(() => { loadKnowledge(); }, [searchQuery, typeFilter]);

  const handleFiles = async (files) => {
    for (const file of files) {
      setProcessing(true);
      setProcessingName(file.name);
      const result = await api.uploadFile(file);
      if (result.error) {
        setDocuments(prev => [...prev, { id: Date.now(), name: file.name, error: true }]);
      } else {
        setDocuments(prev => [result.document, ...prev]);
        setKnowledgeItems(prev => [...result.items.map(i => ({ ...i, source_name: file.name })), ...prev]);
      }
      setProcessing(false);
      setProcessingName("");
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, []);

  const deleteItem = async (id) => {
    await api.deleteItem(id);
    setKnowledgeItems(prev => prev.filter(i => i.id !== id));
  };

  const deleteDocument = async (id) => {
    await api.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    setKnowledgeItems(prev => prev.filter(i => i.document_id !== id));
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChat(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    const history = chat.slice(1);
    const result = await api.chat(userMsg, history);
    setChat(prev => [...prev, {
      role: "assistant",
      content: result.error ? "⚠️ Error: " + result.error : result.reply
    }]);
    setChatLoading(false);
  };

  const formatSize = (b) => b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`;
  const getFileIcon = (name) => {
    const ext = name?.split(".").pop().toLowerCase();
    return { pdf:"📕", md:"📝", txt:"📄", json:"📊", csv:"📊", js:"💻", ts:"💻", py:"🐍" }[ext] || "📄";
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080810", color:"#d4d4d8", fontFamily:"'IBM Plex Mono','Courier New',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0d0d18} ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:4px}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input:focus,textarea:focus{outline:none}
        .del-btn{opacity:0;transition:opacity 0.2s}
        .kg-card:hover .del-btn{opacity:1}
      `}</style>

      {/* Header */}
      <header style={{ padding:"14px 28px", borderBottom:"1px solid #14141f", display:"flex", alignItems:"center", gap:14, background:"linear-gradient(180deg,#0e0e1a,#080810)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#f97316,#fb923c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 16px rgba(249,115,22,0.3)" }}>🧠</div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:"#fff" }}>Knowledge Guardian</div>
          <div style={{ fontSize:9, color:"#444", letterSpacing:3 }}>{user?.org_name || "INSTITUTIONAL MEMORY"}</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
          {processing && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:6, fontSize:10, color:"#f97316" }}>
              <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> {processingName}
            </div>
          )}
          <Stat label="DOCS" value={documents.filter(d=>!d.error).length} color="#38bdf8" />
          <Stat label="ITEMS" value={knowledgeItems.length} color="#f97316" />
          <div style={{ fontSize:11, color:"#555", padding:"0 8px" }}>|</div>
          <span style={{ fontSize:11, color:"#666" }}>{user?.name}</span>
          <button onClick={logout} style={{ padding:"6px 12px", background:"#14141f", border:"1px solid #1e1e2e", borderRadius:6, color:"#555", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>Sign Out</button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display:"flex", padding:"0 28px", borderBottom:"1px solid #14141f", background:"#0a0a14" }}>
        {[
          { id:"capture", icon:"⬇", label:"Capture" },
          { id:"knowledge", icon:"🗂", label:`Knowledge Base${knowledgeItems.length ? ` (${knowledgeItems.length})` : ""}` },
          { id:"chat", icon:"💬", label:"Ask AI" }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"13px 18px", background:"none", border:"none",
            borderBottom: tab===t.id ? "2px solid #f97316" : "2px solid transparent",
            color: tab===t.id ? "#f97316" : "#444",
            cursor:"pointer", fontSize:10, letterSpacing:1.5, fontFamily:"inherit", transition:"color 0.2s"
          }}>{t.icon} {t.label.toUpperCase()}</button>
        ))}
      </nav>

      <main style={{ padding:"28px", maxWidth:900, margin:"0 auto" }}>

        {/* CAPTURE TAB */}
        {tab === "capture" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <SectionHeader title="Document Ingestion" sub="Upload meeting notes, emails, wikis, runbooks, code — anything with knowledge" />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !processing && fileInputRef.current.click()}
              style={{
                border:`2px dashed ${dragging ? "#f97316" : "#2a2a3a"}`, borderRadius:14,
                padding:"40px 24px", textAlign:"center", cursor:processing?"not-allowed":"pointer",
                background: dragging ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)", transition:"all 0.2s"
              }}
            >
              <div style={{ fontSize:36, marginBottom:10 }}>{processing ? "⟳" : dragging ? "📂" : "📁"}</div>
              <div style={{ fontSize:13, color:"#e0e0e0", marginBottom:6, fontWeight:"bold" }}>
                {processing ? `Processing ${processingName}...` : dragging ? "Drop it!" : "Drop documents here or click to browse"}
              </div>
              <div style={{ fontSize:10, color:"#555" }}>Supports .txt .md .pdf .json .csv .js .py .html .log</div>
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf,.json,.csv,.js,.ts,.py,.html,.xml,.log"
                onChange={e => { handleFiles(Array.from(e.target.files)); e.target.value=""; }}
                style={{ display:"none" }} />
            </div>

            {documents.length > 0 && (
              <div style={{ marginTop:28 }}>
                <div style={{ fontSize:10, color:"#444", letterSpacing:2, marginBottom:12 }}>INDEXED DOCUMENTS</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {documents.map(doc => (
                    <div key={doc.id} className="kg-card" style={{ padding:"12px 16px", background:"#0d0d18", border:"1px solid #14141f", borderRadius:10, display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ fontSize:20 }}>{doc.error ? "❌" : getFileIcon(doc.name)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"#e0e0e0", fontWeight:600 }}>{doc.name}</div>
                        <div style={{ fontSize:10, color:"#444", marginTop:2 }}>
                          {doc.error ? "Failed to process" : `${doc.item_count} items · ${formatSize(doc.size)} · ${new Date(doc.uploaded_at).toLocaleString()}`}
                        </div>
                      </div>
                      <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, background: doc.error?"rgba(251,113,133,0.1)":"rgba(74,222,128,0.1)", color:doc.error?"#fb7185":"#4ade80", border:`1px solid ${doc.error?"rgba(251,113,133,0.2)":"rgba(74,222,128,0.2)"}` }}>
                        {doc.error ? "ERROR" : "✓ INDEXED"}
                      </span>
                      {!doc.error && (
                        <button className="del-btn" onClick={() => deleteDocument(doc.id)} style={{ background:"none", border:"none", color:"#fb7185", cursor:"pointer", fontSize:14, padding:"0 4px" }}>🗑</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {tab === "knowledge" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
              <SectionHeader title="Knowledge Base" sub="All extracted decisions, processes, warnings, and contacts" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
                style={{ padding:"8px 12px", background:"#0d0d18", border:"1px solid #1e1e2e", borderRadius:8, color:"#e0e0e0", fontSize:11, fontFamily:"inherit", width:180 }} />
            </div>

            {/* Type filter pills */}
            <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
              <button onClick={() => setTypeFilter("")} style={{
                padding:"3px 12px", borderRadius:20, fontSize:10, cursor:"pointer", fontFamily:"inherit",
                background: !typeFilter ? "rgba(249,115,22,0.15)" : "#0d0d18",
                border:`1px solid ${!typeFilter ? "#f97316" : "#1e1e2e"}`,
                color: !typeFilter ? "#f97316" : "#555"
              }}>All ({knowledgeItems.length})</button>
              {Object.entries(TYPE_STYLES).map(([type, s]) => {
                const count = knowledgeItems.filter(i => i.type === type).length;
                if (!count) return null;
                return (
                  <button key={type} onClick={() => setTypeFilter(typeFilter===type ? "" : type)} style={{
                    padding:"3px 12px", borderRadius:20, fontSize:10, cursor:"pointer", fontFamily:"inherit",
                    background: typeFilter===type ? s.accent+"22" : "#0d0d18",
                    border:`1px solid ${typeFilter===type ? s.accent : "#1e1e2e"}`,
                    color: typeFilter===type ? s.accent : "#555"
                  }}>{s.icon} {s.label} ({count})</button>
                );
              })}
            </div>

            {knowledgeItems.length === 0 ? (
              <Empty icon="🗂" title="No knowledge captured yet" sub="Upload documents in the CAPTURE tab" />
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {knowledgeItems.map(item => {
                  const s = TYPE_STYLES[item.type] || TYPE_STYLES.technical_fact;
                  return (
                    <div key={item.id} className="kg-card" style={{ padding:"14px 16px", background:"#0d0d18", border:"1px solid #14141f", borderLeft:`3px solid ${s.accent}`, borderRadius:10, animation:"fadeIn 0.3s ease" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"flex-start" }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:9, letterSpacing:1.5, padding:"2px 8px", borderRadius:3, background:s.accent+"18", color:s.accent }}>{s.icon} {s.label}</span>
                          {item.confidence >= 0.8 && <span style={{ fontSize:9, color:"#4ade80" }}>HIGH CONFIDENCE</span>}
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:9, color:"#333" }}>📁 {item.source_name}</span>
                          <button className="del-btn" onClick={() => deleteItem(item.id)} style={{ background:"none", border:"none", color:"#fb7185", cursor:"pointer", fontSize:12 }}>✕</button>
                        </div>
                      </div>
                      <div style={{ fontSize:12, color:"#f0f0f0", fontWeight:600, marginBottom:6 }}>{item.title}</div>
                      <div style={{ fontSize:11, color:"#666", lineHeight:1.8 }}>{item.details}</div>
                      {item.actors?.filter(Boolean).length > 0 && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                          {item.actors.filter(Boolean).map(a => (
                            <span key={a} style={{ fontSize:9, padding:"2px 8px", background:"#14141f", borderRadius:20, color:"#555" }}>👤 {a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === "chat" && (
          <div style={{ animation:"fadeIn 0.3s ease", display:"flex", flexDirection:"column", height:"calc(100vh - 220px)" }}>
            <SectionHeader
              title="Ask Your Knowledge Guardian"
              sub={knowledgeItems.length > 0 ? `${knowledgeItems.length} knowledge items from ${documents.length} document(s)` : "Upload documents first"}
            />

            {knowledgeItems.length > 0 && chat.length <= 1 && (
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {["Summarize all key decisions", "What processes should I know?", "Any warnings or critical issues?", "Who are the key contacts?"].map(q => (
                  <button key={q} onClick={() => setChatInput(q)} style={{ padding:"5px 12px", background:"#0d0d18", border:"1px solid #1e1e2e", borderRadius:20, color:"#666", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>{q}</button>
                ))}
              </div>
            )}

            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
              {chat.map((msg, i) => (
                <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", animation:"fadeIn 0.3s ease" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width:26, height:26, borderRadius:7, marginRight:8, flexShrink:0, background:"linear-gradient(135deg,#f97316,#fb923c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🧠</div>
                  )}
                  <div style={{ maxWidth:"75%", padding:"11px 15px", borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:msg.role==="user"?"linear-gradient(135deg,#f97316,#ea580c)":"#0d0d18", border:msg.role==="assistant"?"1px solid #14141f":"none", fontSize:12, lineHeight:1.8, color:"#e0e0e0", whiteSpace:"pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ width:26, height:26, borderRadius:7, marginRight:8, background:"linear-gradient(135deg,#f97316,#fb923c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🧠</div>
                  <div style={{ padding:"11px 15px", background:"#0d0d18", border:"1px solid #14141f", borderRadius:"14px 14px 14px 4px", fontSize:11, color:"#555", display:"flex", alignItems:"center" }}>
                    Searching knowledge base <TypingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && !e.shiftKey && sendChat()}
                placeholder={knowledgeItems.length===0 ? "Upload documents first..." : "Ask anything about your organization..."}
                disabled={chatLoading || knowledgeItems.length===0}
                style={{ flex:1, padding:"12px 16px", background:"#0d0d18", border:"1px solid #1e1e2e", borderRadius:10, color:"#e0e0e0", fontSize:12, fontFamily:"inherit" }} />
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()||knowledgeItems.length===0} style={{ padding:"12px 20px", background:chatLoading||!chatInput.trim()||knowledgeItems.length===0?"#14141f":"linear-gradient(135deg,#f97316,#ea580c)", border:"none", borderRadius:10, color:"#fff", cursor:"pointer", fontSize:16 }}>→</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding:"5px 12px", background:"#0d0d18", border:"1px solid #14141f", borderRadius:6, textAlign:"center" }}>
      <div style={{ fontSize:15, fontWeight:"bold", color, fontFamily:"'Syne',sans-serif" }}>{value}</div>
      <div style={{ fontSize:8, color:"#444", letterSpacing:1.5 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:14, color:"#f0f0f0", fontFamily:"'Syne',sans-serif", fontWeight:700, marginBottom:3 }}>{title}</div>
      <div style={{ fontSize:11, color:"#444" }}>{sub}</div>
    </div>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"#333" }}>
      <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:13, color:"#555", marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:11 }}>{sub}</div>
    </div>
  );
}
