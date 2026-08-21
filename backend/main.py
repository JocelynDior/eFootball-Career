from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.fotmob.com/",
    "Origin": "https://www.fotmob.com",
}

@app.route("/player", methods=["GET"])
def get_player():
    name = request.args.get("name", "")
    if not name:
        return jsonify({"error": "No name provided"}), 400

    try:
        # Search Fotmob for the player
        search_url = f"https://www.fotmob.com/api/search?term={requests.utils.quote(name)}"
        search_res = requests.get(search_url, headers=HEADERS, timeout=10)
        search = search_res.json()

        player_hit = None
        for p in search.get("players", []):
            if name.lower() in p.get("name", "").lower():
                player_hit = p
                break

        # Try first result if no name match
        if not player_hit and search.get("players"):
            player_hit = search["players"][0]

        if not player_hit:
            return jsonify({"error": "Player not found on Fotmob"}), 404

        player_id = player_hit["id"]

        # Fetch player details
        detail_url = f"https://www.fotmob.com/api/playerData?id={player_id}"
        detail = requests.get(detail_url, headers=HEADERS, timeout=10).json()

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
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
