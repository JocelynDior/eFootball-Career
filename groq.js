const GROQ_API_KEY = import.meta.env.VITE_Career_Groq1;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function askGroq(systemPrompt, userPrompt) {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message.content;
}

export async function fetchPlayerStats(playerName) {
  const system = `You are a professional football data analyst. When given a player name, return ONLY a valid JSON object with their stats. No preamble, no markdown, no explanation. You MUST always provide a best estimate even if uncertain. Never leave a field empty or null.

Return exactly this JSON structure:
{
  "name": "Full Name",
  "age": 25,
  "club": "Current Club",
  "nationality": "Country",
  "position": "ST/CF/CAM/CM/CDM/LW/RW/LB/RB/CB/GK",
  "overall": 85,
  "squadNumber": 10,
  "weeklyWage": "€150,000",
  "value": "€85,000,000",
  "contractEnd": "2027",
  "preferredFoot": "Right",
  "height": "180cm",
  "weight": "75kg"
}`;

  const raw = await askGroq(system, `Player: ${playerName}`);
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export function getClubColors(clubName) {
  const club = clubName?.toLowerCase() || "";
  const colorMap = {
    "barcelona": { primary: "#A50044", secondary: "#004D98", text: "#fff" },
    "fc barcelona": { primary: "#A50044", secondary: "#004D98", text: "#fff" },
    "real madrid": { primary: "#FEBE10", secondary: "#fff", text: "#000" },
    "manchester city": { primary: "#6CABDD", secondary: "#1C2C5B", text: "#fff" },
    "manchester united": { primary: "#DA291C", secondary: "#FBE122", text: "#fff" },
    "liverpool": { primary: "#C8102E", secondary: "#00B2A9", text: "#fff" },
    "chelsea": { primary: "#034694", secondary: "#fff", text: "#fff" },
    "arsenal": { primary: "#EF0107", secondary: "#063672", text: "#fff" },
    "tottenham": { primary: "#132257", secondary: "#fff", text: "#fff" },
    "juventus": { primary: "#000", secondary: "#fff", text: "#fff" },
    "ac milan": { primary: "#FB090B", secondary: "#000", text: "#fff" },
    "inter milan": { primary: "#003087", secondary: "#000", text: "#fff" },
    "psg": { primary: "#004170", secondary: "#DA291C", text: "#fff" },
    "paris saint-germain": { primary: "#004170", secondary: "#DA291C", text: "#fff" },
    "atletico madrid": { primary: "#CB3524", secondary: "#002D62", text: "#fff" },
    "borussia dortmund": { primary: "#FDE100", secondary: "#000", text: "#000" },
    "bayer leverkusen": { primary: "#E32221", secondary: "#000", text: "#fff" },
    "rb leipzig": { primary: "#DD0741", secondary: "#fff", text: "#fff" },
    "ajax": { primary: "#D2122E", secondary: "#fff", text: "#fff" },
    "porto": { primary: "#003C87", secondary: "#FFF200", text: "#fff" },
    "benfica": { primary: "#CC0000", secondary: "#fff", text: "#fff" },
    "napoli": { primary: "#12A0C3", secondary: "#fff", text: "#fff" },
    "roma": { primary: "#8E1F2F", secondary: "#F0BC42", text: "#fff" },
    "lazio": { primary: "#87D8F7", secondary: "#fff", text: "#000" },
    "fiorentina": { primary: "#4B2C8F", secondary: "#fff", text: "#fff" },
    "sevilla": { primary: "#D71920", secondary: "#fff", text: "#fff" },
    "villarreal": { primary: "#FFD100", secondary: "#004F9F", text: "#000" },
    "valencia": { primary: "#FF7900", secondary: "#000", text: "#fff" },
    "celtic": { primary: "#169B62", secondary: "#fff", text: "#fff" },
    "rangers": { primary: "#003399", secondary: "#fff", text: "#fff" },
    "galatasaray": { primary: "#E31D1A", secondary: "#F5B800", text: "#fff" },
    "fenerbahce": { primary: "#F9D000", secondary: "#003399", text: "#000" },
    "monaco": { primary: "#D4021D", secondary: "#fff", text: "#fff" },
    "lyon": { primary: "#003B7B", secondary: "#CE2029", text: "#fff" },
    "marseille": { primary: "#2CBFEF", secondary: "#fff", text: "#fff" },
    "newcastle": { primary: "#000", secondary: "#fff", text: "#fff" },
    "west ham": { primary: "#7A263A", secondary: "#1BB1E7", text: "#fff" },
    "aston villa": { primary: "#95BFE5", secondary: "#670E36", text: "#fff" },
    "brighton": { primary: "#0057B8", secondary: "#FFCD00", text: "#fff" },
    "nottingham forest": { primary: "#DD0000", secondary: "#fff", text: "#fff" },
    "wolves": { primary: "#FDB913", secondary: "#231F20", text: "#000" },
  };

  for (const key of Object.keys(colorMap)) {
    if (club.includes(key)) return colorMap[key];
  }
  return { primary: "#FF1493", secondary: "#000033", text: "#fff" };
}
