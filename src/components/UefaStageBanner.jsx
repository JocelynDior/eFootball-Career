import useUefaStageSettings from "../hooks/useUefaStageSettings";

// The knockout-stage image. Same size and shape as the league heading image
// (full width, 16:6). Only shows while the competition is in Knockout mode
// and an image has been uploaded in Admin Settings.
export default function UefaStageBanner({ league }) {
  const { mode, imageUrl } = useUefaStageSettings(league);
  if (mode !== "knockout" || !imageUrl) return null;
  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ width: "100%", aspectRatio: "16/6", position: "relative" }}>
        <img src={imageUrl} alt="Knockout stage" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    </div>
  );
}
