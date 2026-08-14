import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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
