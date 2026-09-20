// Icon paths copied from LeagueGrid.jsx's SLOTS so the Super Cup circles
// always match the icons shown in the grid.
const ICONS = {
  premier:   "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-49-28-AM.png",
  facup:     "/images/leagues/62902133-af8f-469e-a866-bbc254222694.png",
  laliga:    "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-57-59-AM.png",
  copadelrey:"/images/leagues/b9e2de24-7373-436f-bba6-cb097088a374.png",
  seriea:    "/images/leagues/69132ef8-dee8-4910-baa6-21d60a54db45 (1).png",
  coppaitalia:"/images/leagues/6e746ba3-b3ca-4b77-bf8c-91107b7bb520.png",
  bundesliga:"/images/leagues/Chat-GPT-Image-Aug-17-2026-01-09-40-AM-1.png",
  dfbpokal:  "/images/leagues/78ca6619-65fb-4d26-80c8-0e0a989571f0.png",
  ligue1:    "/images/leagues/Chat-GPT-Image-Aug-17-2026-01-05-16-AM.png",
  coupedefrance:"/images/leagues/b49e5dc4-5041-4c43-99a6-fe3b413db5b7.png",
  ucl:       "/images/leagues/Chat-GPT-Image-Aug-16-2026-01-59-24-AM.png",
  uel:       "/images/leagues/Gemini-Generated-Image-2gc5l72gc5l72gc5.jpg",
};

export const SUPER_CUPS = {
  communityshield: {
    league: "communityshield",
    name: "Community Shield",
    emoji: "🛡️",
    path: "/community-shield",
    gridIcon: ICONS.premier, // placeholder — no dedicated Community Shield badge image yet
    left:  { img: ICONS.premier,    label: "Premier League" },
    right: { img: ICONS.facup,      label: "FA Cup" },
  },
  supercopa: {
    league: "supercopa",
    name: "Supercopa de España",
    emoji: "🛡️",
    path: "/supercopa-de-espana",
    gridIcon: ICONS.laliga, // placeholder — no dedicated Supercopa badge image yet
    left:  { img: ICONS.laliga,     label: "La Liga" },
    right: { img: ICONS.copadelrey, label: "Copa del Rey" },
  },
  supercoppa: {
    league: "supercoppa",
    name: "Supercoppa Italiana",
    emoji: "🛡️",
    path: "/supercoppa-italiana",
    gridIcon: ICONS.seriea, // placeholder — no dedicated Supercoppa badge image yet
    left:  { img: ICONS.seriea,     label: "Serie A" },
    right: { img: ICONS.coppaitalia,label: "Coppa Italia" },
  },
  dflsupercup: {
    league: "dflsupercup",
    name: "DFL-Supercup",
    emoji: "🛡️",
    path: "/dfl-supercup",
    gridIcon: ICONS.bundesliga, // placeholder — no dedicated DFL-Supercup badge image yet
    left:  { img: ICONS.bundesliga, label: "Bundesliga" },
    right: { img: ICONS.dfbpokal,   label: "DFB Pokal" },
  },
  tropheedeschampions: {
    league: "tropheedeschampions",
    name: "Trophée des Champions",
    emoji: "🛡️",
    path: "/trophee-des-champions",
    gridIcon: ICONS.ligue1, // placeholder — no dedicated Trophée des Champions badge image yet
    left:  { img: ICONS.ligue1,     label: "Ligue 1" },
    right: { img: ICONS.coupedefrance, label: "Coupe de France" },
  },
  sc: {
    league: "sc",
    name: "UEFA Super Cup",
    emoji: "🥇",
    path: "/super-cup",
    gridIcon: ICONS.sc,
    left:  { img: ICONS.ucl,        label: "Champions League" },
    right: { img: ICONS.uel,        label: "Europa League" },
  },
};
