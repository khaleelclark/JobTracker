import { NextResponse } from "next/server";
import { readControlFile } from "@/lib/fileStore";
import { resolveControlFilePath } from "@/lib/paths";

export async function GET() {
  const text = await readControlFile();
  return NextResponse.json({
    path: resolveControlFilePath(),
    text,
  });
}
