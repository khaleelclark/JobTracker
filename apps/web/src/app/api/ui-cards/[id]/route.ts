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
    const card = await prisma.uiCard.update({
      where: { id },
      data: { state: "dismissed" },
    });

    return NextResponse.json({ card });
  }

  if (action === "archive") {
    const card = await prisma.uiCard.update({
      where: { id },
      data: { state: "archived" },
    });

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
