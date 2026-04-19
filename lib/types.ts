import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: Timestamp;
}

export interface Conversation {
  id: string;
  participants: string[];       // [uid1, uid2]
  participantNames: Record<string, string>;  // { uid1: "Alice", uid2: "Bob" }
  participantPhotos: Record<string, string>; // { uid1: "url", uid2: "url" }
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
}

export interface Message {
  id: string;
  senderId: string;
  type: "text" | "image";
  content: string;
  imageUrl?: string;
  createdAt: Timestamp | null;
}
