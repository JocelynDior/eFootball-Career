import SuperCupTemplate from "../components/SuperCupTemplate";
import { SUPER_CUPS } from "../utils/superCupConfig";

export default function TropheeDesChampionsPage() {
  const cfg = SUPER_CUPS.tropheedeschampions;
  return <SuperCupTemplate league={cfg.league} name={cfg.name} emoji={cfg.emoji} left={cfg.left} right={cfg.right} />;
}
