export const dynamic = "force-dynamic";

import { GoalsProfileForm } from "@/components/forms/GoalsProfileForm";
import { DEFAULT_GOALS_PROFILE, parseGoalsProfile } from "@/lib/goalsProfile";
import { readControlFile } from "@/lib/fileStore";

export default async function GoalsPage() {
  const controlText = await readControlFile();
  const profile = parseGoalsProfile(controlText) ?? DEFAULT_GOALS_PROFILE;

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
