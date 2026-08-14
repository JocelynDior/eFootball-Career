import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, set, push, update, remove, onValue } from "firebase/database";

export function useFirebaseData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    const dbRef = ref(db, path);
    const unsub = onValue(dbRef, (snap) => {
      setData(snap.val());
      setLoading(false);
    });
    return () => unsub();
  }, [path]);

  return { data, loading };
}

export async function firebaseGet(path) {
  const snap = await get(ref(db, path));
  return snap.val();
}

export async function firebaseSet(path, data) {
  await set(ref(db, path), data);
}

export async function firebasePush(path, data) {
  const newRef = await push(ref(db, path), data);
  return newRef.key;
}

export async function firebaseUpdate(path, data) {
  await update(ref(db, path), data);
}

export async function firebaseRemove(path) {
  await remove(ref(db, path));
}
