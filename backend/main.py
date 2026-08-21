from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

HEADERS = { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }

@app.route("/player", methods=["GET"])
def get_player():
    name = request.args.get("name", "")
    if not name:
        return jsonify({"error": "No name provided"}), 400

    try:
        # Search Fotmob for the player
        search = requests.get(
            f"https://www.fotmob.com/api/search?term={requests.utils.quote(name)}",
            headers=HEADERS
        ).json()

        player_hit = None
        for p in search.get("players", []):
            if name.lower() in p.get("name", "").lower():
                player_hit = p
                break

        if not player_hit:
            return jsonify({"error": "Player not found"}), 404

        player_id = player_hit["id"]

        # Fetch player details
        detail = requests.get(
            f"https://www.fotmob.com/api/playerData?id={player_id}",
            headers=HEADERS
        ).json()

        position = detail.get("positionDescription", {}).get("primaryPosition", {}).get("label", "")
        age = detail.get("meta", {}).get("age", "")
        full_name = detail.get("name", player_hit.get("name", name))
        wage = detail.get("contractInfo", {}).get("wage", "")

        return jsonify({
            "fullName": full_name,
            "position": position,
            "age": age,
            "wage": wage,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
