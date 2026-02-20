import fs from "node:fs/promises";
import path from "node:path";
import { resolveControlFilePath, resolveDataDir, resolveResumeDir } from "./paths";

const DEFAULT_CONTROL_TEXT = `GOALS

CONSTRAINTS

FOLLOW UP STRATEGY

EXPERIMENTS

OBSERVATIONS

QUESTIONS FOR GPT

SYSTEM NOTES
`;

export async function ensureDataLayout(): Promise<void> {
  const dataDir = resolveDataDir();
  const resumeDir = resolveResumeDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(resumeDir, { recursive: true });
  await ensureControlFile();
}

export async function ensureControlFile(): Promise<void> {
  const controlPath = resolveControlFilePath();
  try {
    await fs.access(controlPath);
  } catch {
    await fs.mkdir(path.dirname(controlPath), { recursive: true });
    await fs.writeFile(controlPath, DEFAULT_CONTROL_TEXT, "utf8");
  }
}

export async function readControlFile(): Promise<string> {
  await ensureControlFile();
  return fs.readFile(resolveControlFilePath(), "utf8");
}

export async function saveResumeFile(fileName: string, buffer: Buffer): Promise<string> {
  await ensureDataLayout();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storedName = `${timestamp}_${safeName}`;
  const fullPath = path.join(resolveResumeDir(), storedName);

  await fs.writeFile(fullPath, buffer);
  return fullPath;
}

export function isPathWithinResumeDir(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resumeDir = resolveResumeDir();
  const relative = path.relative(resumeDir, resolvedPath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
