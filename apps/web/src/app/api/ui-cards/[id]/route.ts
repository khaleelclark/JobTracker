import { addDays } from "@job-tracker/shared";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateCardStateSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateCardStateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const action = parsed.data.action;

  if (action === "dismiss") {
    const card = await transitionCardState(id, "dismissed");
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card });
  }

  if (action === "archive") {
    const card = await transitionCardState(id, "archived");
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json({ card });
  }

  const days = parsed.data.snoozeDays ?? 1;
  const card = await prisma.uiCard.update({
    where: { id },
    data: {
      snoozedUntil: addDays(new Date(), days),
    },
  });

  return NextResponse.json({ card });
}

async function transitionCardState(
  id: string,
  targetState: "dismissed" | "archived",
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.uiCard.findUnique({
      where: { id },
      select: { id: true, dedupeKey: true },
    });

    if (!existing) {
      return null;
    }

    // Keep latest actionable row for a dedupe/state pair so state transitions
    // cannot fail on the unique (dedupe_key, state) constraint.
    await tx.uiCard.deleteMany({
      where: {
        dedupeKey: existing.dedupeKey,
        state: targetState,
        NOT: { id },
      },
    });

    return tx.uiCard.update({
      where: { id },
      data: { state: targetState },
    });
  });
}
