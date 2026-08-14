import Navbar from "../components/Navbar";

const sections = [
  { title: "1. Acceptance of Terms", content: "By accessing and using Career League, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the platform." },
  { title: "2. User Conduct", content: "Users must conduct themselves respectfully. Cheating, result manipulation, harassment, or any unsportsmanlike conduct will result in immediate removal from the platform." },
  { title: "3. Manager Keys", content: "Manager keys are personal and non-transferable. Sharing your key with others is a violation of these terms and may result in a permanent ban." },
  { title: "4. Result Submissions", content: "All submitted results must be accurate. False or manipulated submissions are a serious violation. The admin team reserves the right to reverse any suspicious result." },
  { title: "5. Account Termination", content: "We reserve the right to suspend or terminate any account or manager key at any time for any violation of these terms." },
  { title: "6. Changes to Terms", content: "These terms may be updated at any time. Continued use of the platform after changes constitutes acceptance of the new terms." },
];

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Terms of Service" />
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "24px", padding: "40px 36px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "3px", color: "#FF1493", marginBottom: "8px" }}>Terms of Service</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginBottom: "32px" }}>Last updated: 2025</p>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "28px", paddingBottom: "28px", borderBottom: i < sections.length - 1 ? "1px solid rgba(255,20,147,0.1)" : "none" }}>
              <h3 style={{ color: "#FF1493", fontWeight: 700, marginBottom: "10px", fontSize: "1rem" }}>{s.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: "0.95rem", margin: 0 }}>{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
