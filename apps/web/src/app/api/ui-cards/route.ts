import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listUiCardsQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listUiCardsQuerySchema.safeParse({
    state: searchParams.get("state")?.trim() || undefined,
    limit: Number(searchParams.get("limit") ?? 100),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { state, limit } = parsed.data;

  const cards = await prisma.uiCard.findMany({
    where: state ? { state } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ cards });
}
