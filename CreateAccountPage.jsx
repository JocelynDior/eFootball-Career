import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAdmin } from "../context/AdminContext";

const ADMIN_KEY = "4975";

/* ─── Shared styles ─── */
const inputStyle = {
  width: "100%",
  padding: "16px 20px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,20,147,0.3)",
  borderRadius: "14px",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const primaryBtn = {
  width: "100%",
  padding: "16px",
  background: "linear-gradient(135deg, #FF1493, #FF69B4)",
  border: "none",
  borderRadius: "14px",
  color: "#fff",
  fontWeight: 700,
  fontSize: "1.05rem",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  boxShadow: "0 4px 20px rgba(255,20,147,0.4)",
  transition: "opacity 0.2s",
  marginTop: "6px",
};

const ghostBtn = {
  width: "100%",
  padding: "14px",
  background: "transparent",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "14px",
  color: "#FF69B4",
  fontWeight: 600,
  fontSize: "0.95rem",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  marginTop: "8px",
};

function ManagerRegister({ onSwitch, onSuccess }) {
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
    if (res.success) {
      navigate("/manager-profile");
    } else {
      setError(res.error);
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>⚽</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem",
          letterSpacing: "3px", color: "#FF1493", margin: "0 0 6px"
        }}>Create Manager Account</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>Join the career league as a manager</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Username</label>
          <input
            value={form.username}
            onChange={e => set("username", e.target.value)}
            placeholder="Your manager name"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder="Min 6 characters"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={e => set("confirmPassword", e.target.value)}
            placeholder="Repeat password"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>

        {/* T&C checkbox */}
        <label style={{
          display: "flex", alignItems: "flex-start", gap: "12px",
          cursor: "pointer", marginTop: "4px"
        }}>
          <div
            onClick={() => setAgreed(a => !a)}
            style={{
              width: "22px", height: "22px", minWidth: "22px",
              borderRadius: "6px",
              border: `2px solid ${agreed ? "#FF1493" : "rgba(255,20,147,0.35)"}`,
              background: agreed ? "rgba(255,20,147,0.2)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: "2px", transition: "all 0.2s",
            }}
          >
            {agreed && <span style={{ color: "#FF1493", fontSize: "0.85rem", fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", lineHeight: 1.5 }}>
            I agree to the{" "}
            <a href="/terms" target="_blank" style={{ color: "#FF1493", textDecoration: "underline" }}>Terms & Conditions</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" style={{ color: "#FF1493", textDecoration: "underline" }}>Privacy Policy</a>
          </span>
        </label>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)",
            borderRadius: "12px", padding: "12px 16px",
            color: "#ff6b6b", fontSize: "0.88rem", textAlign: "center"
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating Account…" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
          Already have an account?{" "}
          <span onClick={() => onSwitch("login")} style={{ color: "#FF1493", cursor: "pointer", fontWeight: 600 }}>
            Sign In
          </span>
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
    if (res.success) {
      navigate("/manager-profile");
    } else {
      setError(res.error);
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🔑</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem",
          letterSpacing: "3px", color: "#FF1493", margin: "0 0 6px"
        }}>Manager Sign In</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>Welcome back, manager</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder="Your password"
            style={inputStyle}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)",
            borderRadius: "12px", padding: "12px 16px",
            color: "#ff6b6b", fontSize: "0.88rem", textAlign: "center"
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing In…" : "Sign In"}
        </button>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
          No account yet?{" "}
          <span onClick={() => onSwitch("register")} style={{ color: "#FF1493", cursor: "pointer", fontWeight: 600 }}>
            Create Account
          </span>
        </div>

        <div style={{ textAlign: "center", marginTop: "8px" }}>
          <span
            onClick={() => onSwitch("admin")}
            style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", cursor: "pointer" }}
          >Admin? Click here</span>
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
      // Store admin profile info
      localStorage.setItem("careerAdminProfile", JSON.stringify({ email: form.email.trim(), username: form.username.trim() }));
      navigate("/admin-profile");
    } else {
      setError("Invalid admin key.");
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🛡️</div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem",
          letterSpacing: "3px", color: "#FF1493", margin: "0 0 6px"
        }}>Admin Access</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem" }}>Restricted — admin credentials required</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Admin Key</label>
          <input
            type="password"
            value={form.key}
            onChange={e => set("key", e.target.value)}
            placeholder="Enter admin key"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="admin@email.com"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>
        <div>
          <label style={labelStyle}>Username</label>
          <input
            value={form.username}
            onChange={e => set("username", e.target.value)}
            placeholder="Admin display name"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = "#FF1493"}
            onBlur={e => e.target.style.borderColor = "rgba(255,20,147,0.3)"}
          />
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)",
            borderRadius: "12px", padding: "12px 16px",
            color: "#ff6b6b", fontSize: "0.88rem", textAlign: "center"
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Verifying…" : "Enter Admin Mode"}
        </button>

        <button onClick={() => onSwitch("login")} style={ghostBtn}>
          ← Back to Manager Login
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.8rem",
  fontWeight: 600,
  letterSpacing: "0.5px",
  marginBottom: "6px",
  textTransform: "uppercase",
};

export default function CreateAccountPage() {
  const [view, setView] = useState("register"); // "register" | "login" | "admin"

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Account" />
      <div style={{ maxWidth: "560px", margin: "48px auto", padding: "0 20px 60px" }}>

        {/* Tab switcher */}
        <div style={{
          display: "flex", gap: "6px", marginBottom: "28px",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,20,147,0.15)",
          borderRadius: "16px", padding: "6px"
        }}>
          {[
            { key: "register", label: "Register" },
            { key: "login", label: "Sign In" },
            { key: "admin", label: "Admin" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              style={{
                flex: 1, padding: "12px",
                background: view === tab.key
                  ? "linear-gradient(135deg, #FF1493, #FF69B4)"
                  : "transparent",
                border: "none", borderRadius: "12px",
                color: view === tab.key ? "#fff" : "rgba(255,255,255,0.45)",
                fontWeight: 700, fontSize: "0.9rem",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,20,147,0.2)",
          borderRadius: "24px",
          padding: "40px 36px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {view === "register" && <ManagerRegister onSwitch={setView} />}
          {view === "login" && <ManagerLogin onSwitch={setView} />}
          {view === "admin" && <AdminLogin onSwitch={setView} />}
        </div>
      </div>
    </div>
  );
}
