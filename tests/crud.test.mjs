import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../apps/web/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "apps/web/prisma/migrations");
const GENERIC_STATUSES = [
  "interested",
  "applied",
  "under_review",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
];

function sqliteFileUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function splitSqlStatements(sql) {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`);
}

async function applyMigrations(prisma) {
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

test("core CRUD across job tracker entities", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-crud-"));
  const dbPath = path.join(tempDir, "crud-test.sqlite");
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

    // Application CRUD
    const application = await prisma.application.create({
      data: {
        companyName: "Acme Corp",
        roleTitle: "Software Engineer",
        genericStatus: "under_review",
        appliedAt: new Date("2026-02-20T10:00:00.000Z"),
        notes: "Initial application submitted",
      },
    });
    const applicationRead = await prisma.application.findUnique({ where: { id: application.id } });
    assert.equal(applicationRead?.companyName, "Acme Corp");
    assert.equal(applicationRead?.genericStatus, "under_review");
    const applicationUpdated = await prisma.application.update({
      where: { id: application.id },
      data: { notes: "Updated notes", genericStatus: "interviewing" },
    });
    assert.equal(applicationUpdated.genericStatus, "interviewing");

    // Resume CRUD (+ relation)
    const resume = await prisma.resume.create({
      data: {
        name: "Resume v1",
        filePath: "/tmp/resume-v1.pdf",
        extractedText: "Resume body",
        applications: {
          create: [{ applicationId: application.id }],
        },
      },
      include: { applications: true },
    });
    assert.equal(resume.applications.length, 1);
    const resumeUpdated = await prisma.resume.update({
      where: { id: resume.id },
      data: { name: "Resume v2" },
    });
    assert.equal(resumeUpdated.name, "Resume v2");

    // MasterSkill CRUD (+ relation to resume)
    const skill = await prisma.masterSkill.create({
      data: {
        name: "TypeScript",
        category: "Programming Language",
        notes: "Used in production web apps",
        resumeLinks: {
          create: [{ resumeId: resume.id }],
        },
      },
      include: { resumeLinks: true },
    });
    assert.equal(skill.resumeLinks.length, 1);
    const skillRead = await prisma.masterSkill.findUnique({ where: { id: skill.id } });
    assert.equal(skillRead?.name, "TypeScript");
    const skillUpdated = await prisma.masterSkill.update({
      where: { id: skill.id },
      data: { notes: "Used in production web + API apps" },
    });
    assert.equal(skillUpdated.notes, "Used in production web + API apps");
    await prisma.masterSkill.delete({ where: { id: skill.id } });
    const skillDeleted = await prisma.masterSkill.findUnique({ where: { id: skill.id } });
    assert.equal(skillDeleted, null);

    await prisma.resume.delete({ where: { id: resume.id } });
    const resumeDeleted = await prisma.resume.findUnique({ where: { id: resume.id } });
    assert.equal(resumeDeleted, null);

    // Interview CRUD
    const interview = await prisma.interview.create({
      data: {
        applicationId: application.id,
        roundIndex: 1,
        roundLabel: "Phone Screen",
        scheduledAt: new Date("2026-02-25T15:00:00.000Z"),
        status: "scheduled",
      },
    });
    const interviewRead = await prisma.interview.findUnique({ where: { id: interview.id } });
    assert.equal(interviewRead?.roundLabel, "Phone Screen");
    const interviewUpdated = await prisma.interview.update({
      where: { id: interview.id },
      data: { status: "completed" },
    });
    assert.equal(interviewUpdated.status, "completed");

    // Reflection CRUD
    const reflection = await prisma.interviewReflection.create({
      data: {
        interviewId: interview.id,
        summary: "Went well",
        outcome: "pending",
      },
    });
    const reflectionUpdated = await prisma.interviewReflection.update({
      where: { id: reflection.id },
      data: { outcome: "advanced" },
    });
    assert.equal(reflectionUpdated.outcome, "advanced");
    await prisma.interviewReflection.delete({ where: { id: reflection.id } });
    const reflectionDeleted = await prisma.interviewReflection.findUnique({ where: { id: reflection.id } });
    assert.equal(reflectionDeleted, null);

    // EmailLog CRUD
    const emailLog = await prisma.emailLog.create({
      data: {
        applicationId: application.id,
        channel: "linkedin",
        direction: "outbound",
        isHuman: true,
        subject: "Follow up",
        body: "Checking in on application",
      },
    });
    const emailUpdated = await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { subject: "Follow up (updated)" },
    });
    assert.equal(emailUpdated.subject, "Follow up (updated)");
    await prisma.emailLog.delete({ where: { id: emailLog.id } });
    const emailDeleted = await prisma.emailLog.findUnique({ where: { id: emailLog.id } });
    assert.equal(emailDeleted, null);

    // FollowupAttempt + FollowupResult CRUD
    const followup = await prisma.followupAttempt.create({
      data: {
        applicationId: application.id,
        attemptIndex: 1,
        channel: "email",
        sentAt: new Date("2026-02-26T12:00:00.000Z"),
      },
    });
    const followupUpdated = await prisma.followupAttempt.update({
      where: { id: followup.id },
      data: { channel: "linkedin" },
    });
    assert.equal(followupUpdated.channel, "linkedin");
    const followupResult = await prisma.followupResult.create({
      data: {
        followupAttemptId: followup.id,
        resultStatus: "pending",
      },
    });
    const followupResultUpdated = await prisma.followupResult.update({
      where: { id: followupResult.id },
      data: { resultStatus: "resolved", responseType: "human_reply", resolvedAt: new Date("2026-02-27T14:00:00.000Z") },
    });
    assert.equal(followupResultUpdated.resultStatus, "resolved");
    await prisma.followupResult.delete({ where: { id: followupResult.id } });
    await prisma.followupAttempt.delete({ where: { id: followup.id } });
    const followupDeleted = await prisma.followupAttempt.findUnique({ where: { id: followup.id } });
    assert.equal(followupDeleted, null);

    // EngagementEvent CRUD
    const event = await prisma.engagementEvent.create({
      data: {
        applicationId: application.id,
        eventType: "recruiter_reply",
        occurredAt: new Date("2026-02-28T09:00:00.000Z"),
      },
    });
    const eventUpdated = await prisma.engagementEvent.update({
      where: { id: event.id },
      data: { eventType: "phone_screen" },
    });
    assert.equal(eventUpdated.eventType, "phone_screen");
    await prisma.engagementEvent.delete({ where: { id: event.id } });
    const eventDeleted = await prisma.engagementEvent.findUnique({ where: { id: event.id } });
    assert.equal(eventDeleted, null);

    // UiCard CRUD
    const card = await prisma.uiCard.create({
      data: {
        cardType: "followup_suggestion",
        priority: "medium",
        title: "Acme follow-up",
        body: "No inbound response yet.",
        evidenceJson: JSON.stringify({ application_id: application.id }),
        dedupeKey: "followup_acme_1",
        state: "active",
        relatedApplicationId: application.id,
      },
    });
    const cardUpdated = await prisma.uiCard.update({
      where: { id: card.id },
      data: { state: "dismissed" },
    });
    assert.equal(cardUpdated.state, "dismissed");
    await prisma.uiCard.delete({ where: { id: card.id } });
    const cardDeleted = await prisma.uiCard.findUnique({ where: { id: card.id } });
    assert.equal(cardDeleted, null);

    // Delete interview then application (final D step)
    await prisma.interview.delete({ where: { id: interview.id } });
    await prisma.application.delete({ where: { id: application.id } });
    const applicationDeleted = await prisma.application.findUnique({ where: { id: application.id } });
    assert.equal(applicationDeleted, null);
  } finally {
    await prisma.$disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("application CRUD supports every generic status", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-crud-statuses-"));
  const dbPath = path.join(tempDir, "crud-statuses-test.sqlite");
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

    // C + R for every status
    const createdIds = [];
    for (let index = 0; index < GENERIC_STATUSES.length; index += 1) {
      const status = GENERIC_STATUSES[index];
      // eslint-disable-next-line no-await-in-loop
      const created = await prisma.application.create({
        data: {
          companyName: `Status Co ${index + 1}`,
          roleTitle: "Status Validation Role",
          genericStatus: status,
          appliedAt: new Date(`2026-03-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`),
        },
      });
      createdIds.push(created.id);
      // eslint-disable-next-line no-await-in-loop
      const readBack = await prisma.application.findUnique({ where: { id: created.id } });
      assert.equal(readBack?.genericStatus, status);
    }

    // U over every status on one row
    const targetId = createdIds[0];
    for (const status of GENERIC_STATUSES) {
      // eslint-disable-next-line no-await-in-loop
      const updated = await prisma.application.update({
        where: { id: targetId },
        data: { genericStatus: status },
      });
      assert.equal(updated.genericStatus, status);
    }

    // D for all rows
    for (const id of createdIds) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.application.delete({ where: { id } });
      // eslint-disable-next-line no-await-in-loop
      const deleted = await prisma.application.findUnique({ where: { id } });
      assert.equal(deleted, null);
    }
  } finally {
    await prisma.$disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
