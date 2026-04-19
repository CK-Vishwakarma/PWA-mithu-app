import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { Conversation, Message } from "./types";

// ─── Conversations ─────────────────────────────────────────────────────────

// Listen to all conversations the current user is part of
export function subscribeToConversations(
  uid: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  // Only filter by participants — no orderBy to avoid composite index requirement
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Conversation)
      // Sort client-side by lastMessageAt descending, nulls last
      .sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis() ?? 0;
        const bTime = b.lastMessageAt?.toMillis() ?? 0;
        return bTime - aTime;
      });
    callback(conversations);
  });
}

// Find existing conversation between two users or create a new one
export async function getOrCreateConversation(
  myUid: string,
  myName: string,
  myPhoto: string,
  theirUid: string,
  theirName: string,
  theirPhoto: string
): Promise<string> {
  // Check if conversation already exists
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid)
  );

  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const data = d.data();
    return data.participants.includes(theirUid);
  });

  if (existing) return existing.id;

  // Create new conversation
  const ref = await addDoc(collection(db, "conversations"), {
    participants: [myUid, theirUid],
    participantNames: { [myUid]: myName, [theirUid]: theirName },
    participantPhotos: { [myUid]: myPhoto, [theirUid]: theirPhoto },
    lastMessage: "",
    lastMessageAt: null,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

// ─── Messages ──────────────────────────────────────────────────────────────

// Listen to messages in a conversation in real-time
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    callback(messages);
  });
}

// Send a text message
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<void> {
  const now = serverTimestamp();

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    type: "text",
    content,
    createdAt: now,
  });

  // Update conversation's last message
  await setDoc(
    doc(db, "conversations", conversationId),
    { lastMessage: content, lastMessageAt: Timestamp.now() },
    { merge: true }
  );
}

// Send an image message
export async function sendImageMessage(
  conversationId: string,
  senderId: string,
  imageUrl: string
): Promise<void> {
  const now = serverTimestamp();

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    type: "image",
    content: "",
    imageUrl,
    createdAt: now,
  });

  await setDoc(
    doc(db, "conversations", conversationId),
    { lastMessage: "📷 Image", lastMessageAt: Timestamp.now() },
    { merge: true }
  );
}
