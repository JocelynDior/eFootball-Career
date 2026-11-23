import useUefaStageSettings from "../hooks/useUefaStageSettings";

// The knockout-stage image. Full width (same width as the league heading image) and
// shown in its OWN proportions, so the whole image is visible — nothing is cropped.
// Only shows while the competition is in Knockout mode and an image is uploaded in
// Admin Settings (domestic cups are always in Knockout mode).
export default function UefaStageBanner({ league }) {
  const { mode, imageUrl } = useUefaStageSettings(league);
  if (mode !== "knockout" || !imageUrl) return null;
  return (
    <div style={{ width: "100%", marginBottom: 24 }}>
      <img src={imageUrl} alt="Knockout stage" style={{ width: "100%", height: "auto", display: "block" }} />
    </div>
  );
}
