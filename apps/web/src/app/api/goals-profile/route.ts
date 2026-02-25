import { NextResponse } from "next/server";
import { readControlFile, writeControlFile } from "@/lib/fileStore";
import { DEFAULT_GOALS_PROFILE, parseGoalsProfile, upsertGoalsProfile } from "@/lib/goalsProfile";
import { goalsProfileSchema } from "@/lib/validation";
import { resolveControlFilePath } from "@/lib/paths";

export async function GET() {
  const controlText = await readControlFile();
  const profile = parseGoalsProfile(controlText) ?? DEFAULT_GOALS_PROFILE;

  return NextResponse.json({
    path: resolveControlFilePath(),
    profile,
  });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const parsed = goalsProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const currentControlText = await readControlFile();
  const nextControlText = upsertGoalsProfile(currentControlText, parsed.data);
  await writeControlFile(nextControlText);

  return NextResponse.json({ ok: true });
}
