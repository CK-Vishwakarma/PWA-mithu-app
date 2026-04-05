import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: "text" | "image";
  content: string;
  imageUrl?: string;
  clientAt: Timestamp;
  createdAt: Timestamp | null;
}

export interface Chat {
  id: string;
  name: string;
  preview: string;
  updatedAt: import("firebase/firestore").Timestamp | null;
}

export interface UserProfile {
  uid: string;
  phoneNumber?: string;
  displayName?: string;
  email?: string;
}
