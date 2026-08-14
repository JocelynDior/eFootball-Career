import Navbar from "../components/Navbar";

const sections = [
  { title: "1. Information We Collect", content: "We collect manager keys, submitted match results, and any content posted on the platform. We do not collect personal identification information unless voluntarily provided." },
  { title: "2. How We Use Information", content: "Information is used solely to operate the Career League platform — displaying results, tracking standings, and managing league data." },
  { title: "3. Firebase & Third-Party Services", content: "We use Google Firebase to store data. Your data is subject to Google's privacy policy. We also use ImgBB and Cloudinary for media hosting." },
  { title: "4. Data Security", content: "We implement reasonable security measures. However, no transmission over the internet is 100% secure. Use the platform at your own risk." },
  { title: "5. Data Retention", content: "League data, results, and posts are retained for the duration of the season and may be archived afterward. Manager keys can be deleted by the admin at any time." },
  { title: "6. Contact", content: "For any privacy concerns, reach out to the league admin directly through the platform." },
];

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Privacy Policy" />
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "24px", padding: "40px 36px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "3px", color: "#FF1493", marginBottom: "8px" }}>Privacy Policy</h1>
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
