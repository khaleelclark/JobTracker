export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_GOALS_PROFILE } from "@/lib/goalsProfile";
import { goalsProfileSchema } from "@/lib/validation";

export async function GET() {
  const row = await prisma.goalsProfile.findUnique({ where: { id: "singleton" } });

  const profile = row
    ? {
        missionStatement: row.missionStatement,
        weeklyApplicationsTarget: row.weeklyApplicationsTarget,
        compensationPreference: row.compensationPreference,
        preferredLocations: row.preferredLocations,
        employmentTypes: JSON.parse(row.employmentTypes) as string[],
        workplaceModes: JSON.parse(row.workplaceModes) as string[],
        priorityNotes: row.priorityNotes,
      }
    : DEFAULT_GOALS_PROFILE;

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const parsed = goalsProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  await prisma.goalsProfile.upsert({
    where: { id: "singleton" },
    update: {
      missionStatement: d.missionStatement ?? "",
      weeklyApplicationsTarget: d.weeklyApplicationsTarget ?? null,
      compensationPreference: d.compensationPreference ?? "",
      preferredLocations: d.preferredLocations ?? "",
      employmentTypes: JSON.stringify(d.employmentTypes ?? []),
      workplaceModes: JSON.stringify(d.workplaceModes ?? []),
      priorityNotes: d.priorityNotes ?? "",
    },
    create: {
      id: "singleton",
      missionStatement: d.missionStatement ?? "",
      weeklyApplicationsTarget: d.weeklyApplicationsTarget ?? null,
      compensationPreference: d.compensationPreference ?? "",
      preferredLocations: d.preferredLocations ?? "",
      employmentTypes: JSON.stringify(d.employmentTypes ?? []),
      workplaceModes: JSON.stringify(d.workplaceModes ?? []),
      priorityNotes: d.priorityNotes ?? "",
    },
  });

  return NextResponse.json({ ok: true });
}
