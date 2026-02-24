export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ResumeCreateForm } from "@/components/forms/ResumeCreateForm";

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
        {resumes.length === 0 ? (
          <p className="muted">No resumes uploaded yet.</p>
        ) : (
          <ul className="clean-list">
            {resumes.map((resume) => (
              <li key={resume.id} className="list-row">
                <div>
                  <strong>{resume.name}</strong>
                  <div className="muted">{resume.filePath}</div>
                </div>
                <div className="muted">
                  {resume.applications.length} linked application{resume.applications.length === 1 ? "" : "s"}
                  {" | "}
                  {resume.masterSkills.length} linked skill{resume.masterSkills.length === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </section>
  );
}

