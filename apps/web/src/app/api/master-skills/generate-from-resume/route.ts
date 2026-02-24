import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/db";
import { extractSkillCandidatesFromResumeText } from "@/lib/skills/extractSkills";
import { generateMasterSkillsFromResumeSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

const execFileAsync = promisify(execFile);
const TEXT_FILE_EXTENSIONS = new Set([".txt", ".md", ".text", ".rtf", ".csv", ".json"]);

async function extractTextFromFilePath(sourcePath: string): Promise<string> {
  const ext = path.extname(sourcePath).toLowerCase();

  try {
    if (ext === ".pdf") {
      const { stdout } = await execFileAsync("pdftotext", ["-layout", sourcePath, "-"]);
      return String(stdout ?? "").trim();
    }

    if (ext === ".docx") {
      // .docx is a zip archive; parse word/document.xml via unzip and strip XML tags.
      const { stdout } = await execFileAsync("unzip", ["-p", sourcePath, "word/document.xml"]);
      const xml = String(stdout ?? "");
      const text = xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/?\s*>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return text;
    }

    if (ext === ".doc") {
      // Best-effort fallback for legacy .doc binaries when dedicated parser isn't installed.
      const { stdout } = await execFileAsync("strings", ["-n", "4", sourcePath]);
      return String(stdout ?? "").trim();
    }

    if (TEXT_FILE_EXTENSIONS.has(ext)) {
      const content = await fs.readFile(sourcePath, "utf8");
      return content.trim();
    }

    return "";
  } catch {
    return "";
  }
}

async function extractTextFromUploadedFile(fileName: string, fileBase64: string): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();
  const buffer = Buffer.from(fileBase64, "base64");

  if (TEXT_FILE_EXTENSIONS.has(ext)) {
    return buffer.toString("utf8").trim();
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-skill-import-"));
  const tempFilePath = path.join(tempDir, `${crypto.randomUUID()}${ext}`);

  try {
    await fs.writeFile(tempFilePath, buffer);
    return await extractTextFromFilePath(tempFilePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function parseSkillsArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 80);
}

interface ParsedSkillCandidate {
  name: string;
  experienceYears: number | null;
}

function normalizeHalfYear(value: number): number {
  return Number((Math.round(value * 2) / 2).toFixed(1));
}

function parseExperienceYears(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0 || value > 60) {
      return null;
    }
    return normalizeHalfYear(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60) {
    return null;
  }

  return normalizeHalfYear(parsed);
}

function inferDefaultExperienceYears(resumeText: string): number {
  const text = resumeText.toLowerCase();

  // Use role seniority cues when present.
  if (/\b(principal|staff|lead|senior)\b/.test(text)) {
    return 8.0;
  }
  if (/\b(mid|intermediate)\b/.test(text)) {
    return 4.0;
  }
  if (/\b(junior|entry[-\s]?level|intern(ship)?)\b/.test(text)) {
    return 1.0;
  }

  // Otherwise infer from explicitly stated "X years" claims and clamp to a sane range.
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\+?\s+years?/g)];
  if (matches.length > 0) {
    const maxYears = matches.reduce((max, match) => {
      const value = Number.parseFloat(match[1] ?? "0");
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    if (maxYears > 0) {
      return normalizeHalfYear(Math.min(20, Math.max(0.5, maxYears)));
    }
  }

  // Deterministic fallback when resume does not provide enough explicit tenure clues.
  return 2.0;
}

function parseSkillsWithExperience(value: unknown): ParsedSkillCandidate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, ParsedSkillCandidate>();

  for (const item of value) {
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) {
        continue;
      }

      const key = name.toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, { name, experienceYears: null });
      }
      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as {
      name?: unknown;
      skill?: unknown;
      experience_years?: unknown;
      experienceYears?: unknown;
      years?: unknown;
    };

    const nameRaw = typeof candidate.name === "string" ? candidate.name : candidate.skill;
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (!name) {
      continue;
    }

    const experienceYears =
      parseExperienceYears(candidate.experience_years) ??
      parseExperienceYears(candidate.experienceYears) ??
      parseExperienceYears(candidate.years);

    const key = name.toLowerCase();
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, { name, experienceYears });
      continue;
    }

    if (existing.experienceYears === null && experienceYears !== null) {
      deduped.set(key, { ...existing, experienceYears });
    }
  }

  return Array.from(deduped.values()).slice(0, 80);
}

async function extractSkillsWithLlm(text: string): Promise<ParsedSkillCandidate[]> {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const openAiBase = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const openAiModel = process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";

  const lmStudioBase = process.env.LMSTUDIO_BASE_URL;
  const endpointBase = openAiApiKey ? openAiBase : lmStudioBase ? `${lmStudioBase.replace(/\/$/, "")}/v1` : "";
  if (!endpointBase) {
    return [];
  }

  const response = await fetch(`${endpointBase.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(openAiApiKey ? { Authorization: `Bearer ${openAiApiKey}` } : {}),
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract only explicit professional/technical skills from resume text. Return JSON: {\"skills\":[{\"name\":\"...\",\"experience_years\":number}]}. experience_years must be an estimated number in 0.5-year increments (no nulls). No commentary.",
        },
        {
          role: "user",
          content: text.slice(0, 20000),
        },
      ],
    }),
  });

  if (!response.ok) {
    return [];
  }

  const json = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = json?.choices?.[0]?.message?.content;

  if (!content) {
    return [];
  }

  try {
    const parsed = JSON.parse(content) as { skills?: unknown };
    const withExperience = parseSkillsWithExperience(parsed.skills);
    if (withExperience.length > 0) {
      return withExperience;
    }

    return parseSkillsArray(parsed.skills).map((name) => ({ name, experienceYears: null }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = generateMasterSkillsFromResumeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  let resumeText = data.resumeText?.trim() ?? "";
  let defaultResumeId: string | null = data.resumeId ?? null;

  if (!resumeText && data.uploadedFileName && data.uploadedFileBase64) {
    resumeText = await extractTextFromUploadedFile(data.uploadedFileName, data.uploadedFileBase64);
  }

  if (!resumeText && data.resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: data.resumeId },
      select: { id: true, name: true, extractedText: true, filePath: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "resume_not_found" }, { status: 404 });
    }

    defaultResumeId = resume.id;
    resumeText = resume.extractedText?.trim() ?? "";
    if (!resumeText) {
      resumeText = resume.filePath ? await extractTextFromFilePath(resume.filePath) : "";
    }

    if (!resumeText) {
      return NextResponse.json(
        {
          error: "resume_text_required",
          message:
            `Resume "${resume.name}" has no extracted text available for parsing. ` +
            "Upload PDF/DOC/DOCX/TXT, paste resume text, or save extractedText on the resume record.",
        },
        { status: 400 },
      );
    }
  }

  if (!resumeText) {
    return NextResponse.json(
      {
        error: "resume_text_required",
        message: "No parsable resume text found. Upload a file or paste resume text.",
      },
      { status: 400 },
    );
  }

  const linkResumeId = data.linkResumeId ?? defaultResumeId;

  if (linkResumeId) {
    const linkedResume = await prisma.resume.findUnique({ where: { id: linkResumeId }, select: { id: true } });
    if (!linkedResume) {
      return NextResponse.json({ error: "link_resume_not_found" }, { status: 404 });
    }
  }

  const ruleBasedCandidates = extractSkillCandidatesFromResumeText(resumeText).map((name) => ({
    name,
    experienceYears: null,
  }));
  const llmCandidates = await extractSkillsWithLlm(resumeText);
  const mergedCandidateMap = new Map<string, ParsedSkillCandidate>();

  for (const candidate of [...ruleBasedCandidates, ...llmCandidates]) {
    const key = candidate.name.toLowerCase();
    const existing = mergedCandidateMap.get(key);

    if (!existing) {
      mergedCandidateMap.set(key, candidate);
      continue;
    }

    if (existing.experienceYears === null && candidate.experienceYears !== null) {
      mergedCandidateMap.set(key, candidate);
    }
  }

  const mergedCandidates = Array.from(mergedCandidateMap.values()).slice(0, 80);
  const fallbackExperienceYears = inferDefaultExperienceYears(resumeText);
  const normalizedCandidates = mergedCandidates.map((candidate) => ({
    ...candidate,
    experienceYears: candidate.experienceYears ?? fallbackExperienceYears,
  }));

  if (normalizedCandidates.length === 0) {
    return NextResponse.json({
      generated: 0,
      linked: 0,
      matchedExisting: 0,
      candidates: [] as ParsedSkillCandidate[],
      message: "No known skills detected from the provided resume text.",
    });
  }

  const existingSkills = await prisma.masterSkill.findMany({
    where: { name: { in: normalizedCandidates.map((candidate) => candidate.name) } },
    select: { id: true, name: true, experienceYears: true },
  });

  const existingByName = new Map(existingSkills.map((row) => [row.name.toLowerCase(), row]));

  const createdNames: string[] = [];
  const linkedPairs: Array<{ resumeId: string; masterSkillId: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const candidate of normalizedCandidates) {
      const existingSkill = existingByName.get(candidate.name.toLowerCase());
      let skillId = existingSkill?.id;

      if (!skillId) {
        const created = await tx.masterSkill.create({
          data: {
            name: candidate.name,
            category: "resume_import",
            experienceYears: candidate.experienceYears,
            notes: "Imported from resume content (rule + LLM parse attempted).",
          },
          select: { id: true },
        });

        skillId = created.id;
        createdNames.push(candidate.name);
      } else if (existingSkill?.experienceYears === null && candidate.experienceYears !== null) {
        await tx.masterSkill.update({
          where: { id: skillId },
          data: { experienceYears: candidate.experienceYears },
        });
      }

      if (linkResumeId) {
        await tx.resumeMasterSkill.upsert({
          where: {
            resumeId_masterSkillId: {
              resumeId: linkResumeId,
              masterSkillId: skillId,
            },
          },
          create: {
            resumeId: linkResumeId,
            masterSkillId: skillId,
          },
          update: {},
        });
        linkedPairs.push({ resumeId: linkResumeId, masterSkillId: skillId });
      }
    }
  });

  await triggerWorkerFromWrite();

  return NextResponse.json({
    generated: createdNames.length,
    linked: linkedPairs.length,
    matchedExisting: normalizedCandidates.length - createdNames.length,
    candidates: normalizedCandidates,
    createdNames,
    usedLlm: true,
  });
}
