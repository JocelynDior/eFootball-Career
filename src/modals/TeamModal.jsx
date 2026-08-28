import React, { useState, useEffect } from "react";
import Modal from "../components/Modal";
import { db } from "../firebase";
import { ref, update, get } from "firebase/database";

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  content: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    padding: "20px",
    borderRadius: "8px",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
  },
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  margin: "8px 0",
  borderRadius: "4px",
  border: "1px solid #333",
  backgroundColor: "#2a2a2a",
  color: "#fff",
};

const labelStyle = {
  fontSize: "0.9rem",
  color: "#aaa",
  marginTop: "10px",
  display: "block",
};

const buttonStyle = {
  padding: "10px 15px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#007bff",
  color: "#fff",
  cursor: "pointer",
  marginTop: "15px",
  width: "100%",
};

export default function TeamModal({ isOpen, onClose, team, leagueId, seasonId }) {
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [position, setPosition] = useState("");
  const [rating, setRating] = useState("");
  const [age, setAge] = useState("");
  const [wage, setWage] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (editingPlayer) {
      setPlayerName(editingPlayer.name || "");
      setPosition(editingPlayer.position || "");
      setRating(editingPlayer.rating || "");
      setAge(editingPlayer.age || "");
      setWage(editingPlayer.wage || "");
      setValue(editingPlayer.value || "");
    }
  }, [editingPlayer]);

  if (!isOpen || !team) return null;

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
  };

  const handleSavePlayer = async () => {
    if (!editingPlayer || !team.id) return;

    try {
      const playerRef = ref(
        db,
        `leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}/squad/${editingPlayer.id}`
      );
      
      await update(playerRef, {
        name: playerName,
        position,
        rating: Number(rating),
        age: Number(age),
        wage: Number(wage),
        value: Number(value),
      });

      setEditingPlayer(null);
    } catch (error) {
      console.error("Error updating player:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={modalStyles}>
      <div>
        <h2>{team.name} Squad</h2>
        {editingPlayer ? (
          <div>
            <h3>Edit Player: {editingPlayer.name}</h3>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Rating</label>
              <input
                type="number"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Age</label>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                readOnly
                style={{ ...inputStyle, opacity: 0.7 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Wage</label>
              <input
                type="number"
                value={wage}
                onChange={(e) => setWage(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Value</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button style={buttonStyle} onClick={handleSavePlayer}>
              Save Changes
            </button>
            <button
              style={{ ...buttonStyle, backgroundColor: "#6c757d", marginTop: "8px" }}
              onClick={() => setEditingPlayer(null)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            {team.squad && Object.keys(team.squad).length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {Object.entries(team.squad).map(([id, player]) => (
                  <li
                    key={id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #333",
                    }}
                  >
                    <span>
                      {player.name} ({player.position}) - {player.rating} OVR
                    </span>
                    <button
                      onClick={() => handleEditPlayer({ id, ...player })}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No players in squad.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
