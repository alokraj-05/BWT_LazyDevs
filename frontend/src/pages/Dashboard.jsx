import { useState, useRef, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useAuth } from "../hooks/useAuth";

const API = "http://localhost:4000";
const getToken = () => localStorage.getItem("kg_token");

const TYPE_COLORS = {
  decision: "#e53e3e",
  process: "#3182ce",
  technical_fact: "#38a169",
  best_practice: "#805ad5",
  warning: "#dd6b20",
  contact: "#d69e2e",
};
const TYPE_LABELS = {
  decision: "DECISION", process: "PROCESS", technical_fact: "TECH FACT",
  best_practice: "BEST PRACTICE", warning: "WARNING", contact: "CONTACT",
};
const TYPE_ICONS = {
  decision: "⚖️", process: "🔄", technical_fact: "⚙️",
  best_practice: "✅", warning: "⚠️", contact: "👤",
};

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 6 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#e53e3e", display: "inline-block", animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [docs, setDocs] = useState([]);
  const [items, setItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processingName, setProcessingName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chat, setChat] = useState([{ role: "assistant", content: `👋 Hi ${user?.name?.split(" ")[0] || "there"}! I'm your Knowledge Guardian. Upload documents in the CAPTURE tab, then ask me anything.` }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const fileInputRef = useRef();
  const chatEndRef = useRef();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const loadData = async () => {
    const [d, k] = await Promise.all([
      fetch(`${API}/knowledge/documents`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
      fetch(`${API}/knowledge`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
    ]);
    if (!d.error) setDocs(d);
    if (!k.error) setItems(k);
  };

  const handleFiles = async (files) => {
    for (const file of files) {
      setProcessing(true);
      setProcessingName(file.name);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/upload`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: form });
      const result = await res.json();
      if (result.error) {
        setDocs(prev => [{ id: Date.now(), name: file.name, error: true }, ...prev]);
      } else {
        setDocs(prev => [result.document, ...prev]);
        setItems(prev => [...result.items.map(i => ({ ...i, source_name: file.name })), ...prev]);
      }
      setProcessing(false);
      setProcessingName("");
    }
  };

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }, []);

  const deleteItem = async (id) => { await fetch(`${API}/knowledge/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }); setItems(p => p.filter(i => i.id !== id)); };
  const deleteDoc = async (id) => { await fetch(`${API}/knowledge/document/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }); setDocs(p => p.filter(d => d.id !== id)); setItems(p => p.filter(i => i.document_id !== id)); };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChat(p => [...p, { role: "user", content: msg }]); setChatLoading(true);
    const res = await fetch(`${API}/chat`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, history: chat.slice(1) }) });
    const data = await res.json();
    setChat(p => [...p, { role: "assistant", content: data.error ? "⚠️ " + data.error : data.reply }]);
    setChatLoading(false);
  };

  // Stats
  const totalItems = items.length;
  const totalDocs = docs.filter(d => !d.error).length;
  const warnings = items.filter(i => i.type === "warning").length;
  const highConf = items.filter(i => i.confidence >= 0.8).length;
  const confidencePct = totalItems > 0 ? Math.round((highConf / totalItems) * 100) : 0;
  const typeCounts = Object.keys(TYPE_COLORS).map(type => ({ type, label: TYPE_LABELS[type], count: items.filter(i => i.type === type).length, color: TYPE_COLORS[type] }));
  const confDist = [
    { label: "High", value: items.filter(i => i.confidence >= 0.8).length, color: "#38a169" },
    { label: "Med", value: items.filter(i => i.confidence >= 0.5 && i.confidence < 0.8).length, color: "#d69e2e" },
    { label: "Low", value: items.filter(i => i.confidence < 0.5).length, color: "#e53e3e" },
  ];
  const docsOverTime = docs.reduce((acc, d) => {
    const date = new Date(d.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const ex = acc.find(a => a.date === date);
    if (ex) ex.count++; else acc.push({ date, count: 1 });
    return acc;
  }, []).slice(-7);

  const filteredItems = items.filter(i => {
    const matchType = !activeType || i.type === activeType;
    const matchSearch = !searchQuery || i.title?.toLowerCase().includes(searchQuery.toLowerCase()) || i.details?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const formatSize = (b) => !b ? "" : b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`;
  const getFileIcon = (name) => ({ pdf:"📕", md:"📝", txt:"📄", json:"📊", csv:"📊", js:"💻", ts:"💻", py:"🐍", docx:"📘", html:"🌐", log:"📋" }[name?.split(".").pop().toLowerCase()] || "📄");

  const TABS = [
    { id: "dashboard", icon: "◈", label: "DASHBOARD" },
    { id: "capture", icon: "⬇", label: "CAPTURE" },
    { id: "knowledge", icon: "🗂", label: `KNOWLEDGE${items.length ? ` (${items.length})` : ""}` },
    { id: "chat", icon: "💬", label: "ASK AI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#e2e8f0", fontFamily: "'Share Tech Mono','Courier New',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#080810} ::-webkit-scrollbar-thumb{background:#e53e3e33;border-radius:4px}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px #e53e3e33}50%{box-shadow:0 0 20px #e53e3e66}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus,textarea:focus{outline:none}
        .del-btn{opacity:0;transition:opacity 0.2s}
        .kg-row:hover .del-btn{opacity:1}
        .kg-row:hover{background:rgba(229,62,62,0.06)!important}
        .tab-btn:hover{color:#e53e3e!important}
        .type-pill:hover{opacity:1!important;transform:scale(1.02);cursor:pointer}
      `}</style>

      {/* Scanline */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:100, overflow:"hidden" }}>
        <div style={{ position:"absolute", width:"100%", height:"1px", background:"linear-gradient(transparent,rgba(229,62,62,0.05),transparent)", animation:"scanline 8s linear infinite" }} />
      </div>

      {/* HEADER */}
      <header style={{ padding:"12px 24px", borderBottom:"1px solid #e53e3e22", display:"flex", alignItems:"center", gap:16, background:"linear-gradient(180deg,#0e0e18,#080810)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ position:"relative" }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#e53e3e,#c53030)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, animation:"glow 2s ease-in-out infinite" }}>🧠</div>
          <div style={{ position:"absolute", top:-1, right:-1, width:8, height:8, borderRadius:"50%", background:"#38a169", animation:"blink 1.5s infinite" }} />
        </div>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:15, fontWeight:900, color:"#fff", letterSpacing:2 }}>KNOWLEDGE GUARDIAN</div>
          <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:4 }}>{user?.org_name || "INSTITUTIONAL MEMORY SYSTEM"}</div>
        </div>

        <div style={{ marginLeft:"auto", display:"flex", gap:16, alignItems:"center" }}>
          {processing && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", background:"rgba(229,62,62,0.1)", border:"1px solid #e53e3e44", borderRadius:6, fontSize:10, color:"#e53e3e" }}>
              <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span> INGESTING {processingName}
            </div>
          )}
          {[
            { label:"DOCS", value:totalDocs, color:"#3182ce" },
            { label:"ITEMS", value:totalItems, color:"#e53e3e" },
            { label:"WARNINGS", value:warnings, color:"#dd6b20" },
          ].map(s => (
            <div key={s.label} style={{ textAlign:"center", padding:"4px 12px", background:"#0d0d18", border:`1px solid ${s.color}33`, borderRadius:6 }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:7, color:"#444", letterSpacing:2 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ fontSize:10, color:"#555" }}>|</div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:12, color:"#e53e3e" }}>{time.toLocaleTimeString()}</div>
            <div style={{ fontSize:8, color:"#444" }}>{user?.name}</div>
          </div>
          <button onClick={logout} style={{ padding:"6px 12px", background:"#0d0d18", border:"1px solid #333", borderRadius:6, color:"#555", cursor:"pointer", fontSize:9, fontFamily:"inherit", letterSpacing:1 }}>SIGN OUT</button>
        </div>
      </header>

      {/* TABS */}
      <nav style={{ display:"flex", padding:"0 24px", borderBottom:"1px solid #e53e3e22", background:"#0a0a12" }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{ padding:"12px 20px", background:"none", border:"none", borderBottom:tab===t.id?"2px solid #e53e3e":"2px solid transparent", color:tab===t.id?"#e53e3e":"#444", cursor:"pointer", fontSize:10, letterSpacing:2, fontFamily:"inherit", transition:"color 0.2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding:"20px 24px", maxWidth:1400, margin:"0 auto" }}>

        {/* ══ DASHBOARD TAB ══ */}
        {tab === "dashboard" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>

            {/* Stat cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
              {[
                { label:"TOTAL KNOWLEDGE ITEMS", value:totalItems, sub:"extracted & indexed", color:"#e53e3e", icon:"📊" },
                { label:"DOCUMENTS INDEXED", value:totalDocs, sub:"processed files", color:"#3182ce", icon:"📁" },
                { label:"ACTIVE WARNINGS", value:warnings, sub:"require attention", color:"#dd6b20", icon:"⚠️" },
                { label:"HIGH CONFIDENCE", value:`${confidencePct}%`, sub:`${highConf} of ${totalItems} items`, color:"#38a169", icon:"✅" },
              ].map((s, i) => (
                <div key={i} style={{ padding:"16px 20px", background:"linear-gradient(135deg,#0d0d14,#12121a)", border:`1px solid ${s.color}44`, borderTop:`3px solid ${s.color}`, borderRadius:8, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, right:0, width:60, height:60, background:`radial-gradient(circle,${s.color}11,transparent)`, borderRadius:"0 0 0 60px" }} />
                  <div style={{ fontSize:8, color:"#555", letterSpacing:2, marginBottom:8 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:32, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:8, color:"#333", marginTop:6, letterSpacing:1 }}>{s.sub.toUpperCase()}</div>
                  <div style={{ position:"absolute", bottom:12, right:16, fontSize:22, opacity:0.2 }}>{s.icon}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ padding:16, background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8 }}>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ KNOWLEDGE DISTRIBUTION</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={typeCounts} barSize={18}>
                    <XAxis dataKey="label" tick={{ fill:"#444", fontSize:7, fontFamily:"monospace" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"#444", fontSize:8 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:"#0d0d14", border:"1px solid #e53e3e44", borderRadius:4, fontFamily:"monospace", fontSize:11 }} labelStyle={{ color:"#e53e3e" }} itemStyle={{ color:"#e2e8f0" }} />
                    <Bar dataKey="count" radius={[3,3,0,0]}>{typeCounts.map((e,i) => <Cell key={i} fill={e.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ padding:16, background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8 }}>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ CONFIDENCE LEVELS</div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={confDist} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={28} paddingAngle={3}>
                      {confDist.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:"#0d0d14", border:"1px solid #e53e3e44", borderRadius:4, fontFamily:"monospace", fontSize:11 }} itemStyle={{ color:"#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                  {confDist.map(c => (
                    <div key={c.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
                      <span style={{ fontSize:8, color:"#555" }}>{c.label} ({c.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding:16, background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8 }}>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ INGESTION TIMELINE</div>
                {docsOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={docsOverTime}>
                      <XAxis dataKey="date" tick={{ fill:"#444", fontSize:8 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:"#444", fontSize:8 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:"#0d0d14", border:"1px solid #e53e3e44", borderRadius:4, fontFamily:"monospace", fontSize:11 }} itemStyle={{ color:"#e2e8f0" }} />
                      <Line type="monotone" dataKey="count" stroke="#e53e3e" strokeWidth={2} dot={{ fill:"#e53e3e", r:3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center", color:"#333", fontSize:10 }}>NO DATA YET</div>
                )}
              </div>
            </div>

            {/* Type breakdown + recent items */}
            <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:12 }}>
              <div style={{ padding:16, background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8 }}>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ TYPE BREAKDOWN</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {typeCounts.map(t => (
                    <div key={t.type}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:8, color:"#666" }}>{t.label}</span>
                        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:10, color:t.color }}>{t.count}</span>
                      </div>
                      <div style={{ height:3, background:"#ffffff0a", borderRadius:2 }}>
                        <div style={{ width:totalItems>0?`${(t.count/totalItems)*100}%`:"0%", height:"100%", background:t.color, borderRadius:2, transition:"width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:16, padding:"10px", background:"#080810", borderRadius:6, textAlign:"center", border:"1px solid #1a1a2e" }}>
                  <div style={{ fontSize:7, color:"#444", letterSpacing:2, marginBottom:4 }}>COVERAGE SCORE</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:26, color:"#e53e3e" }}>
                    {Math.round((typeCounts.filter(t=>t.count>0).length/6)*100)}%
                  </div>
                </div>
              </div>

              <div style={{ padding:16, background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8 }}>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ RECENT KNOWLEDGE ITEMS</div>
                <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 2fr 80px", gap:8, padding:"6px 8px", background:"#080810", borderRadius:4, marginBottom:6 }}>
                  {["TYPE","TITLE","DETAILS","SOURCE"].map(h => <div key={h} style={{ fontSize:7, color:"#e53e3e", letterSpacing:2 }}>{h}</div>)}
                </div>
                <div style={{ maxHeight:240, overflowY:"auto" }}>
                  {items.length === 0 ? (
                    <div style={{ textAlign:"center", padding:40, color:"#333", fontSize:10 }}>NO ITEMS — UPLOAD DOCUMENTS IN CAPTURE TAB</div>
                  ) : items.slice(0,20).map((item, i) => {
                    const color = TYPE_COLORS[item.type] || "#666";
                    return (
                      <div key={item.id} className="kg-row" style={{ display:"grid", gridTemplateColumns:"90px 1fr 2fr 80px", gap:8, padding:"7px 8px", borderBottom:"1px solid #ffffff05", borderLeft:`2px solid ${color}`, marginBottom:2, borderRadius:"0 4px 4px 0", transition:"background 0.15s" }}>
                        <span style={{ fontSize:8, padding:"2px 5px", borderRadius:3, background:`${color}22`, color, letterSpacing:0.5, alignSelf:"center" }}>{TYPE_LABELS[item.type]}</span>
                        <div style={{ fontSize:11, color:"#e0e0e0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", alignSelf:"center" }}>{item.title}</div>
                        <div style={{ fontSize:10, color:"#555", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", alignSelf:"center" }}>{item.details}</div>
                        <div style={{ fontSize:9, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", alignSelf:"center" }}>📁 {item.source_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ CAPTURE TAB ══ */}
        {tab === "capture" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:16 }}>▸ DOCUMENT INGESTION SYSTEM</div>

            <div onDragOver={(e)=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop}
              onClick={()=>!processing&&fileInputRef.current.click()}
              style={{ border:`2px dashed ${dragging?"#e53e3e":"#333"}`, borderRadius:12, padding:"48px 24px", textAlign:"center", cursor:processing?"not-allowed":"pointer", background:dragging?"rgba(229,62,62,0.06)":"rgba(255,255,255,0.01)", transition:"all 0.2s", marginBottom:24 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>{processing?"⟳":dragging?"📂":"📁"}</div>
              <div style={{ fontSize:14, color:"#e0e0e0", marginBottom:6, fontWeight:"bold" }}>{processing?`INGESTING ${processingName}...`:dragging?"RELEASE TO UPLOAD":"DROP DOCUMENTS HERE OR CLICK TO BROWSE"}</div>
              <div style={{ fontSize:10, color:"#444" }}>SUPPORTS: .TXT .MD .PDF .DOCX .JSON .CSV .JS .PY .HTML .LOG</div>
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf,.docx,.json,.csv,.js,.ts,.py,.html,.xml,.log" onChange={e=>{handleFiles(Array.from(e.target.files));e.target.value="";}} style={{ display:"none" }} />
            </div>

            {docs.length > 0 && (
              <>
                <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:12 }}>▸ INDEXED DOCUMENTS ({docs.length})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {docs.map(doc => (
                    <div key={doc.id} className="kg-row" style={{ padding:"12px 16px", background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:8, display:"flex", alignItems:"center", gap:14, transition:"background 0.15s" }}>
                      <div style={{ fontSize:22 }}>{doc.error?"❌":getFileIcon(doc.name)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"#e0e0e0", fontWeight:600 }}>{doc.name}</div>
                        <div style={{ fontSize:9, color:"#444", marginTop:2 }}>{doc.error?"FAILED TO PROCESS":`${doc.item_count} ITEMS · ${formatSize(doc.size)} · ${new Date(doc.uploaded_at).toLocaleString()}`}</div>
                      </div>
                      <span style={{ fontSize:9, padding:"3px 10px", borderRadius:4, background:doc.error?"rgba(229,62,62,0.1)":"rgba(56,161,105,0.1)", color:doc.error?"#e53e3e":"#38a169", border:`1px solid ${doc.error?"#e53e3e44":"#38a16944"}`, letterSpacing:1 }}>{doc.error?"ERROR":"✓ INDEXED"}</span>
                      {!doc.error && <button className="del-btn" onClick={()=>deleteDoc(doc.id)} style={{ background:"none", border:"none", color:"#e53e3e", cursor:"pointer", fontSize:14 }}>🗑</button>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ KNOWLEDGE TAB ══ */}
        {tab === "knowledge" && (
          <div style={{ animation:"fadeIn 0.3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3 }}>▸ KNOWLEDGE BASE — {filteredItems.length} RECORDS</div>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="SEARCH..." style={{ padding:"7px 12px", background:"#0d0d14", border:"1px solid #333", borderRadius:6, color:"#e0e0e0", fontSize:10, fontFamily:"inherit", width:200 }} />
            </div>

            {/* Type filter pills */}
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              <button className="type-pill" onClick={()=>setActiveType(null)} style={{ padding:"4px 14px", borderRadius:20, fontSize:9, cursor:"pointer", fontFamily:"inherit", letterSpacing:1, background:!activeType?"rgba(229,62,62,0.15)":"#0d0d14", border:`1px solid ${!activeType?"#e53e3e":"#222"}`, color:!activeType?"#e53e3e":"#555", transition:"all 0.2s" }}>ALL ({totalItems})</button>
              {typeCounts.map(t => t.count > 0 && (
                <button key={t.type} className="type-pill" onClick={()=>setActiveType(activeType===t.type?null:t.type)} style={{ padding:"4px 14px", borderRadius:20, fontSize:9, cursor:"pointer", fontFamily:"inherit", letterSpacing:1, background:activeType===t.type?`${t.color}22`:"#0d0d14", border:`1px solid ${activeType===t.type?t.color:"#222"}`, color:activeType===t.type?t.color:"#555", transition:"all 0.2s" }}>{TYPE_ICONS[t.type]} {t.label} ({t.count})</button>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🗂</div>
                <div style={{ fontSize:12, color:"#555" }}>{totalItems===0?"NO KNOWLEDGE CAPTURED YET — UPLOAD DOCUMENTS FIRST":"NO ITEMS MATCH YOUR FILTER"}</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredItems.map(item => {
                  const color = TYPE_COLORS[item.type] || "#666";
                  return (
                    <div key={item.id} className="kg-row" style={{ padding:"14px 16px", background:"#0d0d14", border:"1px solid #e53e3e11", borderLeft:`3px solid ${color}`, borderRadius:8, transition:"background 0.15s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"center" }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:8, letterSpacing:1.5, padding:"2px 8px", borderRadius:3, background:`${color}18`, color }}>{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</span>
                          {item.confidence>=0.8 && <span style={{ fontSize:8, color:"#38a169", letterSpacing:1 }}>● HIGH CONF</span>}
                        </div>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <span style={{ fontSize:9, color:"#333" }}>📁 {item.source_name}</span>
                          <button className="del-btn" onClick={()=>deleteItem(item.id)} style={{ background:"none", border:"none", color:"#e53e3e", cursor:"pointer", fontSize:12 }}>✕</button>
                        </div>
                      </div>
                      <div style={{ fontSize:12, color:"#f0f0f0", fontWeight:600, marginBottom:6 }}>{item.title}</div>
                      <div style={{ fontSize:11, color:"#555", lineHeight:1.8 }}>{item.details}</div>
                      {item.actors?.filter(Boolean).length > 0 && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                          {item.actors.filter(Boolean).map(a => <span key={a} style={{ fontSize:8, padding:"2px 8px", background:"#14141f", borderRadius:20, color:"#555" }}>👤 {a}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CHAT TAB ══ */}
        {tab === "chat" && (
          <div style={{ animation:"fadeIn 0.3s ease", display:"flex", flexDirection:"column", height:"calc(100vh - 200px)" }}>
            <div style={{ fontSize:8, color:"#e53e3e", letterSpacing:3, marginBottom:14 }}>▸ AI KNOWLEDGE QUERY INTERFACE — {totalItems} ITEMS LOADED</div>

            {totalItems > 0 && chat.length <= 1 && (
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {["Summarize all key decisions","What warnings should I know?","Who are the key contacts?","What processes exist?"].map(q => (
                  <button key={q} onClick={()=>setChatInput(q)} style={{ padding:"5px 14px", background:"#0d0d14", border:"1px solid #333", borderRadius:20, color:"#555", cursor:"pointer", fontSize:9, fontFamily:"inherit", letterSpacing:1, transition:"all 0.2s" }}>{q}</button>
                ))}
              </div>
            )}

            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
              {chat.map((msg, i) => (
                <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", animation:"fadeIn 0.3s ease" }}>
                  {msg.role==="assistant" && (
                    <div style={{ width:28, height:28, borderRadius:8, marginRight:10, flexShrink:0, background:"linear-gradient(135deg,#e53e3e,#c53030)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🧠</div>
                  )}
                  <div style={{ maxWidth:"75%", padding:"11px 15px", borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:msg.role==="user"?"linear-gradient(135deg,#e53e3e,#c53030)":"#0d0d14", border:msg.role==="assistant"?"1px solid #e53e3e22":"none", fontSize:12, lineHeight:1.8, color:"#e2e8f0", whiteSpace:"pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ width:28, height:28, borderRadius:8, marginRight:10, background:"linear-gradient(135deg,#e53e3e,#c53030)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🧠</div>
                  <div style={{ padding:"11px 15px", background:"#0d0d14", border:"1px solid #e53e3e22", borderRadius:"14px 14px 14px 4px", fontSize:10, color:"#555", display:"flex", alignItems:"center" }}>
                    QUERYING KNOWLEDGE BASE <TypingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
                placeholder={totalItems===0?"UPLOAD DOCUMENTS FIRST...":"QUERY THE KNOWLEDGE BASE..."}
                disabled={chatLoading||totalItems===0}
                style={{ flex:1, padding:"12px 16px", background:"#0d0d14", border:"1px solid #333", borderRadius:8, color:"#e0e0e0", fontSize:11, fontFamily:"inherit" }} />
              <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()||totalItems===0} style={{ padding:"12px 20px", background:chatLoading||!chatInput.trim()||totalItems===0?"#0d0d14":"linear-gradient(135deg,#e53e3e,#c53030)", border:"1px solid #333", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:16, transition:"all 0.2s" }}>→</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
