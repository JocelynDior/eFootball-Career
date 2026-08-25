import TopScorers from "./TopScorers";

export default function TopAssistants({ league, season, onAdd, onEdit, onDelete }) {
  return (
    <TopScorers
      league={league}
      season={season}
      type="assistant"
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
