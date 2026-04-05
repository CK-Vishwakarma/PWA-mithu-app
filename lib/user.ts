import {
  doc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./types";

export async function saveUserProfile(
  uid: string,
  phoneNumber: string | null,
  displayName?: string | null,
  email?: string | null
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      ...(phoneNumber && { phoneNumber }),
      ...(displayName && { displayName }),
      ...(email && { email }),
    },
    { merge: true }
  );
}

export async function searchUsers(
  term: string,
  currentUid: string
): Promise<UserProfile[]> {
  if (!term.trim()) return [];

  const end = term + "\uf8ff";

  // Run queries on email and displayName in parallel
  const [emailSnap, nameSnap] = await Promise.all([
    getDocs(query(
      collection(db, "users"),
      where("email", ">=", term),
      where("email", "<=", end),
      orderBy("email"),
      limit(10)
    )),
    getDocs(query(
      collection(db, "users"),
      where("displayName", ">=", term),
      where("displayName", "<=", end),
      orderBy("displayName"),
      limit(10)
    )),
  ]);

  // Merge, deduplicate by uid, exclude self
  const seen = new Set<string>();
  const results: UserProfile[] = [];

  for (const snap of [emailSnap, nameSnap]) {
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
