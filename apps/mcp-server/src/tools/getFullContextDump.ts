import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const MAX_LIMIT_PER_TABLE = 500;
const DEFAULT_LIMIT_PER_TABLE = 100;
const execFileAsync = promisify(execFile);
const TEXT_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".text",
  ".rtf",
  ".csv",
  ".json",
]);

const inputSchema = z
  .object({
    since: z.coerce.date().optional(),
    limit_per_table: z.number().int().min(1).max(MAX_LIMIT_PER_TABLE).default(DEFAULT_LIMIT_PER_TABLE),
  })
  .default({});

function applySinceFilter(
  since: Date | undefined,
  dateColumn:
    | "createdAt"
    | "updatedAt"
    | "appliedAt"
    | "scheduledAt"
    | "occurredAt"
    | "sentAt",
): Record<string, unknown> | undefined {
  if (!since) {
    return undefined;
  }

  return { [dateColumn]: { gte: since } };
}

async function extractResumeText(
  extractedText: string | null,
  filePath: string,
): Promise<{ source: "db_extracted_text" | "file_read"; text: string } | null> {
  const cleanedExtracted = extractedText?.trim() ?? "";
  if (cleanedExtracted) {
    return {
      source: "db_extracted_text",
      text: cleanedExtracted,
    };
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pdf") {
    try {
      const { stdout } = await execFileAsync("pdftotext", [
        "-layout",
        filePath,
        "-",
      ]);
      const text = String(stdout ?? "").trim();
      return text
        ? {
            source: "file_read",
            text,
          }
        : null;
    } catch {
      return null;
    }
  }

  if (extension === ".docx") {
    try {
      const { stdout } = await execFileAsync("unzip", [
        "-p",
        filePath,
        "word/document.xml",
      ]);
      const xml = String(stdout ?? "");
      const text = xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/?\s*>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return text
        ? {
            source: "file_read",
            text,
          }
        : null;
    } catch {
      return null;
    }
  }

  if (extension === ".doc") {
    try {
      const { stdout } = await execFileAsync("strings", [
        "-n",
        "4",
        filePath,
      ]);
      const text = String(stdout ?? "").trim();
      return text
        ? {
            source: "file_read",
            text,
          }
        : null;
    } catch {
      return null;
    }
  }

  if (!TEXT_FILE_EXTENSIONS.has(extension)) {
    return null;
  }

  try {
    const text = (await fs.readFile(filePath, "utf8")).trim();
    if (!text) {
      return null;
    }

    return {
      source: "file_read",
      text,
    };
  } catch {
    return null;
  }
}

export async function getFullContextDump(input: unknown) {
  const parsed = inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const since = parsed.data.since;
  const limitPerTable = parsed.data.limit_per_table;

  const [
    applications,
    resumes,
    masterSkills,
    resumeMasterSkills,
    applicationResumes,
    interviews,
    interviewReflections,
    emailLogs,
    followupAttempts,
    followupResults,
    engagementEvents,
  ] = await Promise.all([
    prisma.application.findMany({
      where: applySinceFilter(since, "updatedAt"),
      orderBy: { updatedAt: "desc" },
      take: limitPerTable,
    }),
    prisma.resume.findMany({
      where: applySinceFilter(since, "createdAt"),
      orderBy: { createdAt: "desc" },
      take: limitPerTable,
    }),
    prisma.masterSkill.findMany({
      where: applySinceFilter(since, "updatedAt"),
      orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
      take: limitPerTable,
    }),
    prisma.resumeMasterSkill.findMany({
      take: limitPerTable,
      orderBy: [{ resumeId: "asc" }, { masterSkillId: "asc" }],
    }),
    prisma.applicationResume.findMany({
      take: limitPerTable,
      orderBy: [{ applicationId: "asc" }, { resumeId: "asc" }],
    }),
    prisma.interview.findMany({
      where: applySinceFilter(since, "scheduledAt"),
      orderBy: { scheduledAt: "desc" },
      take: limitPerTable,
    }),
    prisma.interviewReflection.findMany({
      where: applySinceFilter(since, "createdAt"),
      orderBy: { createdAt: "desc" },
      take: limitPerTable,
    }),
    prisma.emailLog.findMany({
      where: applySinceFilter(since, "createdAt"),
      orderBy: { createdAt: "desc" },
      take: limitPerTable,
    }),
    prisma.followupAttempt.findMany({
      where: applySinceFilter(since, "sentAt"),
      orderBy: { sentAt: "desc" },
      take: limitPerTable,
    }),
    prisma.followupResult.findMany({
      take: limitPerTable,
      orderBy: { id: "asc" },
    }),
    prisma.engagementEvent.findMany({
      where: applySinceFilter(since, "occurredAt"),
      orderBy: { occurredAt: "desc" },
      take: limitPerTable,
    }),
  ]);

  const resumesWithContent = await Promise.all(
    resumes.map(async (resume) => ({
      ...resume,
      content: await extractResumeText(resume.extractedText, resume.filePath),
    })),
  );

  const data = {
    applications,
    resumes: resumesWithContent,
    master_skills: masterSkills,
    resume_master_skills: resumeMasterSkills,
    application_resumes: applicationResumes,
    interviews,
    interview_reflections: interviewReflections,
    email_logs: emailLogs,
    followup_attempts: followupAttempts,
    followup_results: followupResults,
    engagement_events: engagementEvents,
  };

  const tableCounts = Object.fromEntries(
    Object.entries(data).map(([table, rows]) => [table, Array.isArray(rows) ? rows.length : 0]),
  );

  const likelyTruncatedTables = Object.entries(tableCounts)
    .filter(([, count]) => count >= limitPerTable)
    .map(([table]) => table);

  return truncatePayload({
    warning: {
      level: "high",
      code: "full_context_dump",
      message:
        "Use only when explicitly asked for full/system-wide context. Prefer narrower MCP tools for routine questions.",
    },
    filters: {
      since: since?.toISOString() ?? null,
      limit_per_table: limitPerTable,
    },
    meta: {
      table_counts: tableCounts,
      likely_truncated_tables: likelyTruncatedTables,
      total_tables: Object.keys(tableCounts).length,
    },
    data,
  });
}
