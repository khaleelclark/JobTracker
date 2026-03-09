import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "../apps/web/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "apps/web/prisma/migrations");

function sqliteFileUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`);
}

async function applyMigrations(prisma: PrismaClient): Promise<void> {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const folder of migrationFolders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    const sql = await fs.readFile(sqlPath, "utf8");
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$executeRawUnsafe(statement);
    }
  }
}

function buildJsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function buildContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function importRoute<T>(relativePath: string): Promise<T> {
  const absolute = path.join(repoRoot, relativePath);
  const href = `${pathToFileURL(absolute).href}?t=${Date.now()}-${Math.random()}`;
  return (await import(href)) as T;
}

test("api CRUD routes cover create/read/update/delete flows", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-api-crud-"));
  const dataDir = path.join(tempRoot, "data");
  const dbPath = path.join(tempRoot, "api-crud.sqlite");
  await fs.mkdir(dataDir, { recursive: true });

  process.env.NODE_ENV = "test";
  process.env.JOBTRACKER_DATA_DIR = dataDir;
  process.env.DATABASE_URL = sqliteFileUrl(dbPath);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: sqliteFileUrl(dbPath),
      },
    },
  });

  try {
    await prisma.$connect();
    await applyMigrations(prisma);

    const applicationsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/applications/route.ts");
    const applicationByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/applications/[id]/route.ts");
    const applicationResumesRoute = await importRoute<{
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/applications/[id]/resumes/route.ts");

    const resumesRoute = await importRoute<{
      GET: () => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/resumes/route.ts");
    const resumeByIdRoute = await importRoute<{
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/resumes/[id]/route.ts");

    const interviewsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/interviews/route.ts");
    const interviewByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/interviews/[id]/route.ts");

    const reflectionsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/reflections/route.ts");

    const emailsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/emails/route.ts");
    const emailByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/emails/[id]/route.ts");

    const followupsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/followups/route.ts");
    const followupByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/followups/[id]/route.ts");

    const followupResultsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/followup-results/route.ts");

    const engagementEventsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/engagement-events/route.ts");
    const engagementEventByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/engagement-events/[id]/route.ts");

    const masterSkillsRoute = await importRoute<{
      GET: (request: Request) => Promise<Response>;
      POST: (request: Request) => Promise<Response>;
      DELETE: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/master-skills/route.ts");
    const masterSkillByIdRoute = await importRoute<{
      GET: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
      DELETE: (_: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    }>("apps/web/src/app/api/master-skills/[id]/route.ts");
    const generateMasterSkillsRoute = await importRoute<{
      POST: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/master-skills/generate-from-resume/route.ts");

    const goalsProfileRoute = await importRoute<{
      GET: () => Promise<Response>;
      PUT: (request: Request) => Promise<Response>;
    }>("apps/web/src/app/api/goals-profile/route.ts");

    const createApplicationResponse = await applicationsRoute.POST(
      buildJsonRequest("http://localhost/api/applications", "POST", {
        companyName: "Acme Corp",
        roleTitle: "Backend Engineer",
        careersPageUrl: "https://careers.acme.com/jobs/backend-engineer",
        postingDetails: "Role details",
        compensation: "$150k",
        genericStatus: "applied",
        preciseStatus: null,
        roleFamily: "Engineering",
        roleLevel: "Mid",
        appliedAt: "2026-03-01T10:00:00.000Z",
        notes: "Initial app",
        linkedResumeIds: [],
      }),
    );
    assert.equal(createApplicationResponse.status, 201);
    const createApplicationBody = (await createApplicationResponse.json()) as { application: { id: string } };
    const applicationId = createApplicationBody.application.id;
    const secondApplication = await prisma.application.create({
      data: {
        companyName: "Acme Corp",
        roleTitle: "Platform Engineer",
        genericStatus: "applied",
        appliedAt: new Date("2026-03-02T10:00:00.000Z"),
      },
    });
    const thirdApplication = await prisma.application.create({
      data: {
        companyName: "Beta Corp",
        roleTitle: "Backend Engineer",
        genericStatus: "applied",
        appliedAt: new Date("2026-03-02T11:00:00.000Z"),
      },
    });

    const listApplicationsResponse = await applicationsRoute.GET(
      new Request("http://localhost/api/applications?limit=5"),
    );
    assert.equal(listApplicationsResponse.status, 200);
    const listApplicationsBody = (await listApplicationsResponse.json()) as { applications: Array<{ id: string }> };
    assert.ok(listApplicationsBody.applications.some((item) => item.id === applicationId));

    const createResumeResponse = await resumesRoute.POST(
      buildJsonRequest("http://localhost/api/resumes", "POST", {
        name: "Resume A",
        fileBase64: Buffer.from("resume text").toString("base64"),
        fileName: "resume-a.txt",
        extractedText: "TypeScript Node.js SQL",
        linkedApplicationIds: [applicationId],
        linkedSkillIds: [],
      }),
    );
    assert.equal(createResumeResponse.status, 201);
    const createResumeBody = (await createResumeResponse.json()) as { resume: { id: string; filePath: string } };
    const resumeId = createResumeBody.resume.id;
    const resumePath = createResumeBody.resume.filePath;

    const listResumesResponse = await resumesRoute.GET();
    assert.equal(listResumesResponse.status, 200);
    const listResumesBody = (await listResumesResponse.json()) as { resumes: Array<{ id: string }> };
    assert.ok(listResumesBody.resumes.some((item) => item.id === resumeId));

    const updateApplicationLinksResponse = await applicationResumesRoute.PATCH(
      buildJsonRequest(`http://localhost/api/applications/${applicationId}/resumes`, "PATCH", {
        linkedResumeIds: [resumeId],
      }),
      buildContext(applicationId),
    );
    assert.equal(updateApplicationLinksResponse.status, 200);

    const createSkillResponse = await masterSkillsRoute.POST(
      buildJsonRequest("http://localhost/api/master-skills", "POST", {
        name: "TypeScript",
        category: "language",
        experienceYears: 4,
        notes: "Strong",
        linkedResumeIds: [resumeId],
      }),
    );
    assert.equal(createSkillResponse.status, 201);
    const createSkillBody = (await createSkillResponse.json()) as { skill: { id: string } };
    const skillId = createSkillBody.skill.id;

    const listSkillsResponse = await masterSkillsRoute.GET(new Request("http://localhost/api/master-skills?limit=20"));
    assert.equal(listSkillsResponse.status, 200);
    const listSkillsBody = (await listSkillsResponse.json()) as { skills: Array<{ id: string }> };
    assert.ok(listSkillsBody.skills.some((item) => item.id === skillId));

    const getSkillResponse = await masterSkillByIdRoute.GET(new Request("http://localhost"), buildContext(skillId));
    assert.equal(getSkillResponse.status, 200);

    const updateSkillResponse = await masterSkillByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/master-skills/${skillId}`, "PATCH", {
        name: "TypeScript",
        category: "language",
        experienceYears: 5,
        notes: "Very strong",
        linkedResumeIds: [resumeId],
      }),
      buildContext(skillId),
    );
    assert.equal(updateSkillResponse.status, 200);

    const generateSkillsResponse = await generateMasterSkillsRoute.POST(
      buildJsonRequest("http://localhost/api/master-skills/generate-from-resume", "POST", {
        resumeText: "Skills: TypeScript, Node.js, PostgreSQL, React",
        linkResumeId: resumeId,
      }),
    );
    assert.equal(generateSkillsResponse.status, 200);
    const generateSkillsBody = (await generateSkillsResponse.json()) as { candidates?: unknown[] };
    assert.ok(Array.isArray(generateSkillsBody.candidates));

    const updateResumeResponse = await resumeByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/resumes/${resumeId}`, "PATCH", {
        name: "Resume A Updated",
        filePath: resumePath,
        extractedText: "Updated text",
        linkedApplicationIds: [applicationId],
        linkedSkillIds: [skillId],
      }),
      buildContext(resumeId),
    );
    assert.equal(updateResumeResponse.status, 200);

    const updateApplicationResponse = await applicationByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/applications/${applicationId}`, "PATCH", {
        companyName: "Acme Corp",
        roleTitle: "Backend Engineer II",
        careersPageUrl: "https://careers.acme.com/jobs/backend-engineer-ii",
        postingDetails: "Role details updated",
        compensation: "$160k",
        genericStatus: "under_review",
        preciseStatus: "screening",
        roleFamily: "Engineering",
        roleLevel: "Mid",
        appliedAt: "2026-03-01T10:00:00.000Z",
        notes: "Updated app",
        linkedResumeIds: [resumeId],
      }),
      buildContext(applicationId),
    );
    assert.equal(updateApplicationResponse.status, 200);

    const getApplicationResponse = await applicationByIdRoute.GET(new Request("http://localhost"), buildContext(applicationId));
    assert.equal(getApplicationResponse.status, 200);
    const getApplicationBody = (await getApplicationResponse.json()) as { application: { careersPageUrl: string | null } };
    assert.equal(getApplicationBody.application.careersPageUrl, "https://careers.acme.com/jobs/backend-engineer-ii");

    const createInterviewResponse = await interviewsRoute.POST(
      buildJsonRequest("http://localhost/api/interviews", "POST", {
        applicationId,
        roundIndex: 1,
        roundLabel: "Phone Screen",
        scheduledAt: "2026-03-05T15:00:00.000Z",
        status: "scheduled",
      }),
    );
    assert.equal(createInterviewResponse.status, 201);
    const createInterviewBody = (await createInterviewResponse.json()) as { interview: { id: string } };
    const interviewId = createInterviewBody.interview.id;

    const listInterviewsResponse = await interviewsRoute.GET(
      new Request(`http://localhost/api/interviews?applicationId=${applicationId}`),
    );
    assert.equal(listInterviewsResponse.status, 200);

    const getInterviewResponse = await interviewByIdRoute.GET(new Request("http://localhost"), buildContext(interviewId));
    assert.equal(getInterviewResponse.status, 200);

    const updateInterviewResponse = await interviewByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/interviews/${interviewId}`, "PATCH", {
        applicationId,
        roundIndex: 1,
        roundLabel: "Phone Screen",
        scheduledAt: "2026-03-05T15:00:00.000Z",
        status: "completed",
      }),
      buildContext(interviewId),
    );
    assert.equal(updateInterviewResponse.status, 200);

    const createReflectionResponse = await reflectionsRoute.POST(
      buildJsonRequest("http://localhost/api/reflections", "POST", {
        interviewId,
        summary: "Good conversation",
        outcome: "pending",
      }),
    );
    assert.equal(createReflectionResponse.status, 201);

    const updateReflectionViaUpsertResponse = await reflectionsRoute.POST(
      buildJsonRequest("http://localhost/api/reflections", "POST", {
        interviewId,
        summary: "Great conversation",
        outcome: "advanced",
      }),
    );
    assert.equal(updateReflectionViaUpsertResponse.status, 201);

    const listReflectionsResponse = await reflectionsRoute.GET(
      new Request(`http://localhost/api/reflections?interviewId=${interviewId}`),
    );
    assert.equal(listReflectionsResponse.status, 200);

    const createEmailResponse = await emailsRoute.POST(
      buildJsonRequest("http://localhost/api/emails", "POST", {
        applicationId,
        channel: "linkedin",
        direction: "outbound",
        isHuman: true,
        subject: "Hello",
        body: "Following up",
        notes: "note",
      }),
    );
    assert.equal(createEmailResponse.status, 201);
    const createEmailBody = (await createEmailResponse.json()) as { emailLog: { id: string } };
    const emailId = createEmailBody.emailLog.id;

    const createMultiApplicationEmailResponse = await emailsRoute.POST(
      buildJsonRequest("http://localhost/api/emails", "POST", {
        applicationIds: [applicationId, secondApplication.id],
        channel: "linkedin",
        direction: "outbound",
        isHuman: true,
        subject: "Batch update",
        body: "Sharing the same update for both roles",
        notes: "multi-link",
      }),
    );
    assert.equal(createMultiApplicationEmailResponse.status, 201);
    const createMultiApplicationEmailBody = (await createMultiApplicationEmailResponse.json()) as {
      emailLogs: Array<{ applicationId: string }>;
      createdCount: number;
    };
    assert.equal(createMultiApplicationEmailBody.createdCount, 2);
    assert.deepEqual(
      createMultiApplicationEmailBody.emailLogs.map((email) => email.applicationId).sort(),
      [applicationId, secondApplication.id].sort(),
    );

    const createCompanyEmailResponse = await emailsRoute.POST(
      buildJsonRequest("http://localhost/api/emails", "POST", {
        companyName: "Acme Corp",
        channel: "email",
        direction: "inbound",
        isHuman: true,
        subject: "Company-wide recruiter update",
        body: "We have updates across your applications",
        notes: "company-link",
      }),
    );
    assert.equal(createCompanyEmailResponse.status, 201);
    const createCompanyEmailBody = (await createCompanyEmailResponse.json()) as {
      emailLog: { applicationId: string | null; companyName: string | null };
    };
    assert.equal(createCompanyEmailBody.emailLog.applicationId, null);
    assert.equal(createCompanyEmailBody.emailLog.companyName, "Acme Corp");

    const invalidMixedTargetEmailResponse = await emailsRoute.POST(
      buildJsonRequest("http://localhost/api/emails", "POST", {
        applicationId: thirdApplication.id,
        companyName: "Acme Corp",
        channel: "email",
        direction: "outbound",
        isHuman: true,
        subject: "Invalid mixed target",
        body: "Should fail",
      }),
    );
    assert.equal(invalidMixedTargetEmailResponse.status, 400);

    const listEmailsResponse = await emailsRoute.GET(
      new Request(`http://localhost/api/emails?applicationId=${applicationId}`),
    );
    assert.equal(listEmailsResponse.status, 200);
    const listEmailsBody = (await listEmailsResponse.json()) as { emailLogs: Array<{ id: string }> };
    assert.ok(listEmailsBody.emailLogs.length >= 2);

    const getEmailResponse = await emailByIdRoute.GET(new Request("http://localhost"), buildContext(emailId));
    assert.equal(getEmailResponse.status, 200);

    const updateEmailResponse = await emailByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/emails/${emailId}`, "PATCH", {
        applicationId,
        channel: "email",
        direction: "inbound",
        isHuman: true,
        subject: "Re: Hello",
        body: "Thanks for the update",
        notes: "updated",
      }),
      buildContext(emailId),
    );
    assert.equal(updateEmailResponse.status, 200);

    const emailCountBeforeMultiEdit = await prisma.emailLog.count();
    const updateEmailToMultipleApplicationsResponse = await emailByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/emails/${emailId}`, "PATCH", {
        applicationIds: [applicationId, thirdApplication.id],
        channel: "linkedin",
        direction: "outbound",
        isHuman: true,
        subject: "Shared update",
        body: "Sending same message to two linked applications",
        notes: "multi-edit",
      }),
      buildContext(emailId),
    );
    assert.equal(updateEmailToMultipleApplicationsResponse.status, 200);
    const emailCountAfterMultiEdit = await prisma.emailLog.count();
    assert.equal(emailCountAfterMultiEdit, emailCountBeforeMultiEdit + 1);
    const linkedThirdAppEmail = await prisma.emailLog.findFirst({
      where: {
        applicationId: thirdApplication.id,
        subject: "Shared update",
      },
    });
    assert.ok(linkedThirdAppEmail);

    const createFollowupResponse = await followupsRoute.POST(
      buildJsonRequest("http://localhost/api/followups", "POST", {
        applicationId,
        attemptIndex: 1,
        channel: "email",
        sentAt: "2026-03-06T12:00:00.000Z",
      }),
    );
    assert.equal(createFollowupResponse.status, 201);
    const createFollowupBody = (await createFollowupResponse.json()) as { followup: { id: string } };
    const followupId = createFollowupBody.followup.id;

    const listFollowupsResponse = await followupsRoute.GET(
      new Request(`http://localhost/api/followups?applicationId=${applicationId}`),
    );
    assert.equal(listFollowupsResponse.status, 200);

    const getFollowupResponse = await followupByIdRoute.GET(new Request("http://localhost"), buildContext(followupId));
    assert.equal(getFollowupResponse.status, 200);

    const updateFollowupResponse = await followupByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/followups/${followupId}`, "PATCH", {
        applicationId,
        attemptIndex: 2,
        channel: "linkedin",
        sentAt: "2026-03-07T12:00:00.000Z",
      }),
      buildContext(followupId),
    );
    assert.equal(updateFollowupResponse.status, 200);

    const createFollowupResultResponse = await followupResultsRoute.POST(
      buildJsonRequest("http://localhost/api/followup-results", "POST", {
        followupAttemptId: followupId,
        resultStatus: "pending",
      }),
    );
    assert.equal(createFollowupResultResponse.status, 201);

    const updateFollowupResultViaUpsertResponse = await followupResultsRoute.POST(
      buildJsonRequest("http://localhost/api/followup-results", "POST", {
        followupAttemptId: followupId,
        resultStatus: "resolved",
        responseType: "rejection_reply",
        resolvedAt: "2026-03-08T15:00:00.000Z",
      }),
    );
    assert.equal(updateFollowupResultViaUpsertResponse.status, 201);
    const appAfterRejectionReply = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { genericStatus: true },
    });
    assert.equal(appAfterRejectionReply?.genericStatus, "rejected");

    const listFollowupResultsResponse = await followupResultsRoute.GET(
      new Request(`http://localhost/api/followup-results?followupAttemptId=${followupId}`),
    );
    assert.equal(listFollowupResultsResponse.status, 200);

    const createEventResponse = await engagementEventsRoute.POST(
      buildJsonRequest("http://localhost/api/engagement-events", "POST", {
        applicationId,
        eventType: "recruiter_reply",
        occurredAt: "2026-03-09T09:00:00.000Z",
      }),
    );
    assert.equal(createEventResponse.status, 201);
    const createEventBody = (await createEventResponse.json()) as { event: { id: string } };
    const eventId = createEventBody.event.id;

    const listEventsResponse = await engagementEventsRoute.GET(
      new Request(`http://localhost/api/engagement-events?applicationId=${applicationId}`),
    );
    assert.equal(listEventsResponse.status, 200);

    const getEventResponse = await engagementEventByIdRoute.GET(new Request("http://localhost"), buildContext(eventId));
    assert.equal(getEventResponse.status, 200);

    const updateEventResponse = await engagementEventByIdRoute.PATCH(
      buildJsonRequest(`http://localhost/api/engagement-events/${eventId}`, "PATCH", {
        applicationId,
        eventType: "phone_screen",
        occurredAt: "2026-03-10T09:00:00.000Z",
      }),
      buildContext(eventId),
    );
    assert.equal(updateEventResponse.status, 200);

    const goalsGetResponse = await goalsProfileRoute.GET();
    assert.equal(goalsGetResponse.status, 200);

    const goalsPutResponse = await goalsProfileRoute.PUT(
      buildJsonRequest("http://localhost/api/goals-profile", "PUT", {
        missionStatement: "Stay consistent",
        weeklyApplicationsTarget: 12,
        compensationPreference: "$150k+",
        preferredLocations: "Remote",
        employmentTypes: ["full-time"],
        workplaceModes: ["remote"],
        priorityNotes: "Prioritize backend platform roles",
      }),
    );
    assert.equal(goalsPutResponse.status, 200);

    const deleteEventResponse = await engagementEventByIdRoute.DELETE(new Request("http://localhost"), buildContext(eventId));
    assert.equal(deleteEventResponse.status, 200);

    const deleteFollowupResponse = await followupByIdRoute.DELETE(new Request("http://localhost"), buildContext(followupId));
    assert.equal(deleteFollowupResponse.status, 200);

    const deleteEmailResponse = await emailByIdRoute.DELETE(new Request("http://localhost"), buildContext(emailId));
    assert.equal(deleteEmailResponse.status, 200);

    const deleteInterviewResponse = await interviewByIdRoute.DELETE(new Request("http://localhost"), buildContext(interviewId));
    assert.equal(deleteInterviewResponse.status, 200);

    const deleteSkillResponse = await masterSkillByIdRoute.DELETE(new Request("http://localhost"), buildContext(skillId));
    assert.equal(deleteSkillResponse.status, 200);

    const deleteAllSkillsResponse = await masterSkillsRoute.DELETE(
      buildJsonRequest("http://localhost/api/master-skills", "DELETE", { confirmDeleteAll: true }),
    );
    assert.equal(deleteAllSkillsResponse.status, 200);

    const deleteResumeResponse = await resumeByIdRoute.DELETE(new Request("http://localhost"), buildContext(resumeId));
    assert.equal(deleteResumeResponse.status, 200);

    const deleteApplicationResponse = await applicationByIdRoute.DELETE(
      new Request("http://localhost"),
      buildContext(applicationId),
    );
    assert.equal(deleteApplicationResponse.status, 200);
  } finally {
    await prisma.$disconnect();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
