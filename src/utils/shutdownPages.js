// Pages the admin can shut down individually (Shut Down → Specific Pages).
// `key` is what gets stored in Firebase (career_global_settings/pageShutdowns/<key>),
// `path` is the route it guards. Home and Settings are deliberately left out so
// visitors always have somewhere to go.
export const SHUTDOWN_PAGE_GROUPS = [
  {
    label: "Leagues",
    pages: [
      { key: "premier-league", label: "Premier League", path: "/premier-league" },
      { key: "la-liga",        label: "La Liga",        path: "/la-liga" },
      { key: "serie-a",        label: "Serie A",        path: "/serie-a" },
      { key: "bundesliga",     label: "Bundesliga",     path: "/bundesliga" },
      { key: "ligue-1",        label: "Ligue 1",        path: "/ligue-1" },
    ],
  },
  {
    label: "Cups",
    pages: [
      { key: "fa-cup",           label: "FA Cup",         path: "/fa-cup" },
      { key: "copa-del-rey",     label: "Copa del Rey",   path: "/copa-del-rey" },
      { key: "coppa-italia",     label: "Coppa Italia",   path: "/coppa-italia" },
      { key: "dfb-pokal",        label: "DFB Pokal",      path: "/dfb-pokal" },
      { key: "coupe-de-france",  label: "Coupe de France", path: "/coupe-de-france" },
    ],
  },
  {
    label: "Super Cups",
    pages: [
      { key: "community-shield",      label: "Community Shield",      path: "/community-shield" },
      { key: "supercopa",             label: "Supercopa de España",   path: "/supercopa-de-espana" },
      { key: "supercoppa",            label: "Supercoppa Italiana",   path: "/supercoppa-italiana" },
      { key: "dfl-supercup",          label: "DFL Supercup",          path: "/dfl-supercup" },
      { key: "trophee-des-champions", label: "Trophée des Champions", path: "/trophee-des-champions" },
    ],
  },
  {
    label: "European & Global",
    pages: [
      { key: "champions-league",  label: "Champions League",  path: "/champions-league" },
      { key: "europa-league",     label: "Europa League",     path: "/europa-league" },
      { key: "conference-league", label: "Conference League", path: "/conference-league" },
      { key: "club-world-cup",    label: "Club World Cup",    path: "/club-world-cup" },
      { key: "uefa-super-cup",    label: "UEFA Super Cup",    path: "/super-cup" },
    ],
  },
  {
    label: "Other Pages",
    pages: [
      { key: "transfer-market",  label: "Transfer Market",  path: "/transfer-market" },
      { key: "team-management",  label: "Team Management",  path: "/team-management" },
      { key: "calendar",         label: "Calendar",         path: "/calendar" },
      { key: "manager-rankings", label: "Manager Rankings", path: "/manager-rankings" },
      { key: "squad",            label: "Squad",            path: "/squad" },
      { key: "rivals-squads",    label: "Rivals Squads",    path: "/rivals-squads" },
      { key: "manager-profile",  label: "Manager Profile",  path: "/manager-profile" },
      { key: "eawards",          label: "E-Awards",         path: "/eawards" },
      { key: "rules-tutorials",  label: "Rules & Tutorials", path: "/rules-tutorials" },
    ],
  },
];

export const SHUTDOWN_PAGES = SHUTDOWN_PAGE_GROUPS.flatMap(g => g.pages);

export function pageKeyForPath(pathname) {
  const clean = (pathname || "").replace(/\/+$/, "") || "/";
  return SHUTDOWN_PAGES.find(p => p.path === clean)?.key || null;
}
