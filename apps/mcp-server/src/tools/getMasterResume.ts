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
  const parsedResume = JSON.parse(text) as unknown;
  const masterResume = unwrapMasterResume(parsedResume);

  return {
    owner: parsed.data.owner ?? "default",
    path: masterResumePath,
    master_resume: masterResume,
  };
}

function unwrapMasterResume(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "master_resume" in value
  ) {
    return (value as { master_resume: unknown }).master_resume;
  }

  return value;
}

async function resolveMasterResumePath(owner: string | undefined): Promise<string> {
  if (!owner) {
    return MASTER_RESUME_PATH;
  }

  // Check project root for a bundled <name>-master-resume.json (e.g. patrick-master-resume.json)
  const bundledPath = path.join(PROJECT_ROOT, `${owner.toLowerCase()}-master-resume.json`);
  if (await fileExists(bundledPath)) {
    return bundledPath;
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
