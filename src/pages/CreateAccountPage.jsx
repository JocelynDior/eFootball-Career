import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAdmin } from "../context/AdminContext";

const ADMIN_KEY = "4975";

const inputStyle = {
  width: "100%",
  padding: "20px 24px",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "16px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "1.2rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const primaryBtn = {
  width: "100%",
  padding: "20px",
  background: "linear-gradient(135deg, #FF1493, #FF69B4)",
  border: "none",
  borderRadius: "16px",
  color: "#fff",
  fontWeight: 700,
  fontSize: "1.2rem",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  boxShadow: "0 4px 24px rgba(255,20,147,0.45)",
  transition: "opacity 0.2s, transform 0.2s",
  marginTop: "8px",
};

const ghostBtn = {
  width: "100%",
  padding: "18px",
  background: "transparent",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "16px",
  color: "#FF69B4",
  fontWeight: 600,
  fontSize: "1.1rem",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  marginTop: "10px",
  transition: "background 0.2s",
};

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.6)",
  fontSize: "0.95rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  marginBottom: "8px",
  textTransform: "uppercase",
};

function ManagerRegister({ onSwitch }) {
  const { registerManager } = useAdmin();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", username: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit() {
    setError("");
    if (!form.username.trim()) return setError("Username is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!agreed) return setError("You must agree to the Terms & Conditions.");
    setLoading(true);
    const res = await registerManager({ email: form.email.trim(), password: form.password, username: form.username.trim() });
    setLoading(false);
    if (res.success) navigate("/manager-profile");
    else setError(res.error);
  }

  return (
    <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "4.5rem", marginBottom: "14px" }}>⚽</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 8px" }}>Create Manager Account</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem" }}>Join the career league as a manager</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div><label style={labelStyle}>Username</label>
          <input value={form.username} onChange={e => set("username", e.target.value)} placeholder="Your manager name" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Password</label>
          <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 6 characters" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Confirm Password</label>
          <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Repeat password" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: "14px", cursor: "pointer", marginTop: "4px" }}>
          <div onClick={() => setAgreed(a => !a)} style={{ width: "28px", height: "28px", minWidth: "28px", borderRadius: "8px", border: `2px solid ${agreed ? "#FF1493" : "rgba(255,20,147,0.35)"}`, background: agreed ? "rgba(255,20,147,0.2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "2px", transition: "all 0.2s" }}>
            {agreed && <span style={{ color: "#FF1493", fontSize: "1rem", fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "1rem", lineHeight: 1.5 }}>
            I agree to the{" "}<a href="/terms" target="_blank" style={{ color: "#FF1493", textDecoration: "underline" }}>Terms & Conditions</a>{" "}and{" "}<a href="/privacy" target="_blank" style={{ color: "#FF1493", textDecoration: "underline" }}>Privacy Policy</a>
          </span>
        </label>
        {error && <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "14px", padding: "14px 18px", color: "#ff6b6b", fontSize: "1rem", textAlign: "center", animation: "fadeSlideIn 0.2s ease" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
          {loading ? "Creating Account…" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "1rem" }}>
          Already have an account?{" "}<span onClick={() => onSwitch("login")} style={{ color: "#FF1493", cursor: "pointer", fontWeight: 600 }}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

function ManagerLogin({ onSwitch }) {
  const { loginManager } = useAdmin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit() {
    setError("");
    if (!form.email.trim() || !form.password) return setError("Please fill in all fields.");
    setLoading(true);
    const res = await loginManager({ email: form.email.trim(), password: form.password });
    setLoading(false);
    if (res.success) navigate("/manager-profile");
    else setError(res.error);
  }

  return (
    <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "4.5rem", marginBottom: "14px" }}>🔑</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 8px" }}>Manager Sign In</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem" }}>Welcome back, manager</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div><label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Password</label>
          <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Your password" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        {error && <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "14px", padding: "14px 18px", color: "#ff6b6b", fontSize: "1rem", textAlign: "center", animation: "fadeSlideIn 0.2s ease" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
          {loading ? "Signing In…" : "Sign In"}
        </button>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "1rem" }}>
          No account yet?{" "}<span onClick={() => onSwitch("register")} style={{ color: "#FF1493", cursor: "pointer", fontWeight: 600 }}>Create Account</span>
        </div>
        <div style={{ textAlign: "center", marginTop: "4px" }}>
          <span onClick={() => onSwitch("admin")} style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem", cursor: "pointer" }}>Admin? Click here</span>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onSwitch }) {
  const { loginAdmin } = useAdmin();
  const [form, setForm] = useState({ key: "", email: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit() {
    setError("");
    if (!form.key.trim()) return setError("Admin key is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.username.trim()) return setError("Username is required.");
    if (form.key !== ADMIN_KEY) return setError("Invalid admin key.");
    setLoading(true);
    const success = loginAdmin(form.key);
    setLoading(false);
    if (success) {
      localStorage.setItem("careerAdminProfile", JSON.stringify({ email: form.email.trim(), username: form.username.trim() }));
      navigate("/admin-profile");
    } else {
      setError("Invalid admin key.");
    }
  }

  return (
    <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "4.5rem", marginBottom: "14px" }}>🛡️</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.2rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 8px" }}>Admin Access</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05rem" }}>Restricted — admin credentials required</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div><label style={labelStyle}>Admin Key</label>
          <input type="password" value={form.key} onChange={e => set("key", e.target.value)} placeholder="Enter admin key" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="admin@email.com" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div><label style={labelStyle}>Username</label>
          <input value={form.username} onChange={e => set("username", e.target.value)} placeholder="Admin display name" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "#FF1493"; e.target.style.boxShadow = "0 0 0 3px rgba(255,20,147,0.15)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,20,147,0.3)"; e.target.style.boxShadow = "none"; }} />
        </div>
        {error && <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "14px", padding: "14px 18px", color: "#ff6b6b", fontSize: "1rem", textAlign: "center", animation: "fadeSlideIn 0.2s ease" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
          {loading ? "Verifying…" : "Enter Admin Mode"}
        </button>
        <button onClick={() => onSwitch("login")} style={ghostBtn}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}>
          ← Back to Manager Login
        </button>
      </div>
    </div>
  );
}

export default function CreateAccountPage() {
  const [view, setView] = useState("register");

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <div style={{ width: "100%", padding: "40px 24px 80px", boxSizing: "border-box", maxWidth: "720px", margin: "0 auto" }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "20px", padding: "8px" }}>
          {[{ key: "register", label: "Register" }, { key: "login", label: "Sign In" }, { key: "admin", label: "Admin" }].map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)} style={{ flex: 1, padding: "16px", background: view === tab.key ? "linear-gradient(135deg, #FF1493, #FF69B4)" : "transparent", border: "none", borderRadius: "14px", color: view === tab.key ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "28px", padding: "48px 40px", boxShadow: "0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          {view === "register" && <ManagerRegister onSwitch={setView} />}
          {view === "login" && <ManagerLogin onSwitch={setView} />}
          {view === "admin" && <AdminLogin onSwitch={setView} />}
        </div>
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
