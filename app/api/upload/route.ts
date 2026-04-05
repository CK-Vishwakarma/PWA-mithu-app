import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUrl, getPublicUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const { contentType, size, chatId } = await req.json();

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
    }

    if (size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    const ext = contentType.split("/")[1];
    const key = `chats/${chatId}/${randomUUID()}.${ext}`;

    const uploadUrl = await generatePresignedUrl(key, contentType);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch {
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
