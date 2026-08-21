import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AdminProvider } from "./context/AdminContext";
import FeedPage from "./pages/FeedPage";
import PremierLeaguePage from "./pages/PremierLeaguePage";
import LaLigaPage from "./pages/LaLigaPage";
import SerieAPage from "./pages/SerieAPage";
import BundesligaPage from "./pages/BundesligaPage";
import Ligue1Page from "./pages/Ligue1Page";
import ChampionsLeaguePage from "./pages/ChampionsLeaguePage";
import EuropaLeaguePage from "./pages/EuropaLeaguePage";
import ClubWorldCupPage from "./pages/ClubWorldCupPage";
import SuperCupPage from "./pages/SuperCupPage";
import TokyoPage from "./pages/TokyoPage";
import CreateAccountPage from "./pages/CreateAccountPage";
import TransferMarketPage from "./pages/TransferMarketPage";
import TeamManagementPage from "./pages/TeamManagementPage";
import CalendarPage from "./pages/CalendarPage";
import ManagerRankingsPage from "./pages/ManagerRankingsPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AdminCalendarPage from "./pages/AdminCalendarPage";
import ManagerProfilePage from "./pages/ManagerProfilePage";
import AdminProfilePage from "./pages/AdminProfilePage";
import RivalsSquadPage from "./pages/RivalsSquadPage";
import SquadPage from "./pages/SquadPage";

// Newly created files
import { groq } from "./utils/groq"; // adjust import style if it's default or named
import AddPlayerModal from "./modals/AddPlayerModal";
import RequestBuyModal from "./modals/RequestBuyModal";
import RequestLoanModal from "./modals/RequestLoanModal";
import AuctionBidModal from "./modals/AuctionBidModal";
import PlayerPopupModal from "./modals/PlayerPopupModal";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

function InactivityWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, INACTIVITY_LIMIT);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <InactivityWatcher />
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/premier-league" element={<PremierLeaguePage />} />
          <Route path="/la-liga" element={<LaLigaPage />} />
          <Route path="/serie-a" element={<SerieAPage />} />
          <Route path="/bundesliga" element={<BundesligaPage />} />
          <Route path="/ligue-1" element={<Ligue1Page />} />
          <Route path="/champions-league" element={<ChampionsLeaguePage />} />
          <Route path="/europa-league" element={<EuropaLeaguePage />} />
          <Route path="/club-world-cup" element={<ClubWorldCupPage />} />
          <Route path="/super-cup" element={<SuperCupPage />} />
          <Route path="/tokyo" element={<TokyoPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/transfer-market" element={<TransferMarketPage />} />
          <Route path="/team-management" element={<TeamManagementPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/manager-rankings" element={<ManagerRankingsPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/admin-calendar" element={<AdminCalendarPage />} />
          <Route path="/manager-profile" element={<ManagerProfilePage />} />
          <Route path="/admin-profile" element={<AdminProfilePage />} />
          <Route path="/rivals-squads" element={<RivalsSquadPage />} />
          <Route path="/squad" element={<SquadPage />} />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}
