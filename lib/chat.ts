import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Message, Chat } from "./types";

// ─── Conversations ────────────────────────────────────────────────

export function subscribeToConversations(
  uid: string,
  callback: (chats: Chat[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "users", uid, "conversations"),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Chat[];
    callback(chats);
  });
}

export async function createConversation(
  uid: string,
  chatId: string,
  name: string
): Promise<void> {
  await setDoc(doc(db, "users", uid, "conversations", chatId), {
    name,
    preview: "",
    updatedAt: serverTimestamp(),
  });
}

// ─── Messages ─────────────────────────────────────────────────────

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    chatId,
    senderId,
    type: "text",
    content,
    clientAt: Timestamp.now(),
    createdAt: serverTimestamp(),
  });

  // Update preview on sender's conversation entry
  await setDoc(
    doc(db, "users", senderId, "conversations", chatId),
    { preview: content, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function sendImageMessage(
  chatId: string,
  senderId: string,
  imageUrl: string
): Promise<void> {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    chatId,
    senderId,
    type: "image",
    content: "",
    imageUrl,
    clientAt: Timestamp.now(),
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "users", senderId, "conversations", chatId),
    { preview: "📷 Image", updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  // Order by clientAt — always present, even before serverTimestamp resolves
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("clientAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
    callback(messages);
  });
}
