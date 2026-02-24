export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { MasterSkillGenerateFromResumeForm } from "@/components/forms/MasterSkillGenerateFromResumeForm";
import { SkillsInventoryGrid } from "@/components/skills/SkillsInventoryGrid";

export default async function SkillsPage() {
  const [skills, resumes] = await Promise.all([
    prisma.masterSkill.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: {
        resumeLinks: {
          include: {
            resume: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Master Skills</h1>
        <p className="muted">Keep one canonical skills list for resume tailoring and AI context.</p>
      </header>

      <div className="card stack-md">
        <SkillsInventoryGrid
          title="Skills Inventory"
          skills={skills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            category: skill.category,
            experienceYears: skill.experienceYears,
            notes: skill.notes,
            linkedResumeCount: skill.resumeLinks.length,
            linkedResumeIds: skill.resumeLinks.map((link) => link.resumeId),
          }))}
          resumeOptions={resumes}
        />
      </div>

      <MasterSkillGenerateFromResumeForm resumes={resumes} />
    </section>
  );
}
