import SuperCupTemplate from "../components/SuperCupTemplate";
import { SUPER_CUPS } from "../utils/superCupConfig";

export default function SupercoppaItalianaPage() {
  const cfg = SUPER_CUPS.supercoppa;
  return <SuperCupTemplate league={cfg.league} name={cfg.name} emoji={cfg.emoji} left={cfg.left} right={cfg.right} />;
}
