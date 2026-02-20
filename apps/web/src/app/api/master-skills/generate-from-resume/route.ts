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

async function extractSkillsWithLlm(text: string): Promise<string[]> {
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
            "Extract only explicit professional/technical skills from resume text. Return JSON: {\"skills\":[...]} with short skill names. No commentary.",
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
    return parseSkillsArray(parsed.skills);
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

  const ruleBasedCandidates = extractSkillCandidatesFromResumeText(resumeText);
  const llmCandidates = await extractSkillsWithLlm(resumeText);
  const mergedCandidates = Array.from(new Set([...ruleBasedCandidates, ...llmCandidates])).slice(0, 80);

  if (mergedCandidates.length === 0) {
    return NextResponse.json({
      generated: 0,
      linked: 0,
      matchedExisting: 0,
      candidates: [],
      message: "No known skills detected from the provided resume text.",
    });
  }

  const existingSkills = await prisma.masterSkill.findMany({
    where: { name: { in: mergedCandidates } },
    select: { id: true, name: true },
  });

  const existingByName = new Map(existingSkills.map((row) => [row.name.toLowerCase(), row.id]));

  const createdNames: string[] = [];
  const linkedPairs: Array<{ resumeId: string; masterSkillId: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const candidate of mergedCandidates) {
      const existingId = existingByName.get(candidate.toLowerCase());
      let skillId = existingId;

      if (!skillId) {
        const created = await tx.masterSkill.create({
          data: {
            name: candidate,
            category: "resume_import",
            notes: "Imported from resume content (rule + LLM parse attempted).",
          },
          select: { id: true },
        });

        skillId = created.id;
        createdNames.push(candidate);
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
    matchedExisting: mergedCandidates.length - createdNames.length,
    candidates: mergedCandidates,
    createdNames,
    usedLlm: true,
  });
}
