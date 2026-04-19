import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./types";

// Called on every login — creates or updates the user's profile doc
export async function saveUserProfile(
  uid: string,
  displayName: string,
  email: string,
  photoURL?: string | null
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  await setDoc(
    ref,
    {
      uid,
      displayName,
      email,
      photoURL: photoURL ?? "",
      // Only set createdAt on first save
      ...(!snap.exists() && { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

// Search users by displayName or email prefix — excludes self
export async function searchUsers(
  term: string,
  currentUid: string
): Promise<UserProfile[]> {
  if (!term.trim()) return [];

  const end = term + "\uf8ff";

  const [nameSnap, emailSnap] = await Promise.all([
    getDocs(query(
      collection(db, "users"),
      where("displayName", ">=", term),
      where("displayName", "<=", end),
      orderBy("displayName"),
      limit(10)
    )),
    getDocs(query(
      collection(db, "users"),
      where("email", ">=", term),
      where("email", "<=", end),
      orderBy("email"),
      limit(10)
    )),
  ]);

  const seen = new Set<string>();
  const results: UserProfile[] = [];

  for (const snap of [nameSnap, emailSnap]) {
    for (const d of snap.docs) {
      const profile = d.data() as UserProfile;
      if (profile.uid !== currentUid && !seen.has(profile.uid)) {
        seen.add(profile.uid);
        results.push(profile);
      }
    }
  }

  return results;
}
