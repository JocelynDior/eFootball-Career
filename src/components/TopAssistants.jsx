import TopScorers from "./TopScorers";

export default function TopAssistants({ assistants, onAdd, onEdit, onDelete, teamIconsCache }) {
  return <TopScorers scorers={assistants} type="assistant" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} teamIconsCache={teamIconsCache} />;
}
