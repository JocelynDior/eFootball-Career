import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDJCnltEBfrkBfiny7gXISkTLwajA7KztE",
  authDomain: "careermode-f98d0.firebaseapp.com",
  databaseURL: "https://careermode-f98d0-default-rtdb.firebaseio.com",
  projectId: "careermode-f98d0",
  storageBucket: "careermode-f98d0.firebasestorage.app",
  messagingSenderId: "1097161287082",
  appId: "1:1097161287082:web:dd3fc65ac45770f6d6b7d3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const PATHS = {
  posts: "career_posts",
  stories: "career_stories",
  teamIcons: "career_team_icons",
  managerKeys: "career_manager_keys",
  playedOpponents: "career_played_opponents",
  fixtures: "career_fixtures",
  rankings: "career_rankings",
  transfers: "career_transfers",
  accounts: "career_accounts",
  leagueSettings: (league) => `career_${league}_settings`,
  table: (league, season) => `career_${league}/seasons/season_${season}/table`,
  results: (league, season) => `career_${league}/seasons/season_${season}/results`,
  pendingResults: (league, season) => `career_${league}/seasons/season_${season}/pending_results`,
  topScorers: (league, season) => `career_${league}/seasons/season_${season}/top_scorers`,
  topAssistants: (league, season) => `career_${league}/seasons/season_${season}/top_assistants`,
  managerHistory: (league, season) => `career_${league}/seasons/season_${season}/manager_history`,
};

export { ref, set, get, push, update, remove };
