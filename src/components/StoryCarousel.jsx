import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

export default function StoryCarousel() {
  const [stories, setStories] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef(null);
  const { isAdmin } = useAdmin();

  useEffect(() => {
    const dbRef = ref(db, PATHS.stories);
    const unsub = onValue(dbRef, snap => {
      const data = snap.val();
      if (data) setStories(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (stories.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % stories.length);
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [stories]);

  if (!stories.length) return null;

  const prev = stories[(activeIdx - 1 + stories.length) % stories.length];
  const curr = stories[activeIdx];
  const next = stories[(activeIdx + 1) % stories.length];

  const visible = stories.length === 1 ? [curr] : stories.length === 2 ? [prev, curr] : [prev, curr, next];

  return (
    <div style={{
      padding: "24px 0", background: "rgba(0,0,0,0.2)",
      borderBottom: "1px solid rgba(255,20,147,0.15)",
      display: "flex", justifyContent: "center", alignItems: "center", gap: "20px",
      overflow: "hidden"
    }}>
      {visible.map((story, i) => {
        const isCenter = stories.length === 1 ? true : i === 1;
        const size = isCenter ? 90 : 58;
        return (
          <div key={story.id} onClick={() => setActiveIdx(stories.indexOf(story))}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "8px", cursor: "pointer",
              transform: isCenter ? "scale(1)" : "scale(0.85)",
              opacity: isCenter ? 1 : 0.55,
              filter: isCenter ? "none" : "blur(1.5px)",
              transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }}>
            <div style={{
              width: size + 6, height: size + 6, borderRadius: "50%",
              background: isCenter
                ? "linear-gradient(45deg, #FF1493, #FF69B4, #FFB6C1)"
                : "rgba(255,20,147,0.3)",
              padding: "3px", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isCenter ? "0 0 20px rgba(255,20,147,0.5)" : "none",
              transition: "all 0.4s ease"
            }}>
              <img src={story.imageUrl} alt={story.caption || ""}
                style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "3px solid #000020" }} />
            </div>
            {isCenter && story.caption && (
              <span style={{
                color: "#fff", fontSize: "0.75rem", maxWidth: "90px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textAlign: "center", animation: "fadeInUp 0.3s ease"
              }}>{story.caption}</span>
            )}
          </div>
        );
      })}
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
