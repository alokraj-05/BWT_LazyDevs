import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", org_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.org_name);
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🧠</div>
        <h1 style={styles.title}>Knowledge Guardian</h1>
        <p style={styles.sub}>Institutional Memory System</p>

        <div style={styles.tabs}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              ...styles.tab, ...(mode === m ? styles.tabActive : {})
            }}>{m === "login" ? "Sign In" : "Create Account"}</button>
          ))}
        </div>

        {mode === "register" && (
          <>
            <input name="name" placeholder="Full name" value={form.name} onChange={handle} style={styles.input} />
            <input name="org_name" placeholder="Organization name (optional)" value={form.org_name} onChange={handle} style={styles.input} />
          </>
        )}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handle} style={styles.input} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handle}
          style={styles.input} onKeyDown={e => e.key === "Enter" && submit()} />

        {error && <div style={styles.error}>{error}</div>}

        <button onClick={submit} disabled={loading} style={styles.btn}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", background: "#080810", display: "flex",
    alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace"
  },
  card: {
    background: "#0d0d18", border: "1px solid #1e1e2e", borderRadius: 16,
    padding: "40px 36px", width: 380, display: "flex", flexDirection: "column", gap: 12
  },
  logo: { fontSize: 40, textAlign: "center" },
  title: { color: "#fff", fontSize: 20, fontWeight: 800, textAlign: "center", margin: 0 },
  sub: { color: "#444", fontSize: 10, letterSpacing: 3, textAlign: "center", textTransform: "uppercase", margin: 0 },
  tabs: { display: "flex", background: "#14141f", borderRadius: 8, padding: 4, gap: 4, marginTop: 8 },
  tab: {
    flex: 1, padding: "8px", background: "none", border: "none",
    color: "#555", cursor: "pointer", borderRadius: 6, fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s"
  },
  tabActive: { background: "#1e1e2e", color: "#f97316" },
  input: {
    padding: "11px 14px", background: "#14141f", border: "1px solid #1e1e2e",
    borderRadius: 8, color: "#e0e0e0", fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace", outline: "none"
  },
  error: { background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)", borderRadius: 6, padding: "8px 12px", color: "#fb7185", fontSize: 11 },
  btn: {
    padding: "12px", background: "linear-gradient(135deg, #f97316, #ea580c)",
    border: "none", borderRadius: 8, color: "#fff", fontSize: 13,
    fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", fontWeight: 600, marginTop: 4
  },
};
