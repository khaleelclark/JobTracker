export const dynamic = "force-dynamic";

import { GoalsProfileForm } from "@/components/forms/GoalsProfileForm";
import { DEFAULT_GOALS_PROFILE } from "@/lib/goalsProfile";
import { prisma } from "@/lib/db";

export default async function GoalsPage() {
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

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Goals</h1>
        <p className="muted">Define mission, preferences, and job-search priorities for AI-assisted analysis.</p>
      </header>

      <GoalsProfileForm initialProfile={profile} />
    </section>
  );
}
