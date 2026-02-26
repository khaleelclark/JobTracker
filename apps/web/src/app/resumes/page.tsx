export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ResumeCreateForm } from "@/components/forms/ResumeCreateForm";
import { ResumeLibrary } from "@/components/ResumeLibrary";

export default async function ResumesPage() {
  const [resumes, applications, masterSkills] = await Promise.all([
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        applications: {
          include: { application: true },
        },
        masterSkills: {
          include: { masterSkill: true },
        },
      },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
    prisma.masterSkill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true },
    }),
  ]);

  return (
    <section className="stack-xl">
      <header className="page-header">
        <h1>Resumes</h1>
        <p className="muted">Store resume files and link them to applications.</p>
      </header>

      <div className="layout-split">
        <ResumeCreateForm applications={applications} skills={masterSkills} />
        <div className="card stack-md">
          <h2 className="no-margin">Resume Library</h2>
          <ResumeLibrary
            resumes={resumes.map((resume) => ({
              id: resume.id,
              name: resume.name,
              filePath: resume.filePath,
              extractedText: resume.extractedText,
              linkedApplicationIds: resume.applications.map((entry) => entry.applicationId),
              linkedSkillIds: resume.masterSkills.map((entry) => entry.masterSkillId),
            }))}
            applications={applications}
            skills={masterSkills}
          />
        </div>
      </div>
    </section>
  );
}

