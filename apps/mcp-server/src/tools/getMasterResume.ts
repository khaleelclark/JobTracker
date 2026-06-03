import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { resolveMasterResumeDir } from "../lib/paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const MASTER_RESUME_PATH =
  process.env.MASTER_RESUME_PATH ?? path.join(PROJECT_ROOT, "khaleel-master-resume.json");

const PROJECT_MASTER_RESUME_FILES: Record<string, string> = {
  khaleel: MASTER_RESUME_PATH,
  patrick: path.join(PROJECT_ROOT, "patrick-master-resume.json"),
};

const inputSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

export async function getMasterResume(input: unknown) {
  const parsed = inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const masterResumePath = await resolveMasterResumePath(parsed.data.owner);

  const text = await fs.readFile(masterResumePath, "utf8");
  const masterResume = JSON.parse(text) as unknown;

  return {
    owner: parsed.data.owner ?? "default",
    path: masterResumePath,
    master_resume: masterResume,
  };
}

async function resolveMasterResumePath(owner: string | undefined): Promise<string> {
  if (!owner) {
    return MASTER_RESUME_PATH;
  }

  const projectFile = PROJECT_MASTER_RESUME_FILES[owner.toLowerCase()];
  if (projectFile && (await fileExists(projectFile))) {
    return projectFile;
  }

  return path.join(resolveMasterResumeDir(), `${owner}.json`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
