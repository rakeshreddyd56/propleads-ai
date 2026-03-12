import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;
  const { userId } = await auth();

  const jsonResponse = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async () => {
      if (!userId) throw new Error("Unauthorized");
      return {
        allowedContentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 20 * 1024 * 1024, // 20MB
      };
    },
    onUploadCompleted: async () => {},
  });

  return NextResponse.json(jsonResponse);
}
