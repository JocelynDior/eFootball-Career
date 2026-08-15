import Navbar from "../components/Navbar";
import StoryCarousel from "../components/StoryCarousel";
import Feed from "../components/Feed";
import CountdownTimers from "../components/CountdownTimers";

export default function FeedPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Career Mode" />
      <StoryCarousel />
      <CountdownTimers />
      <Feed />
    </div>
  );
}
