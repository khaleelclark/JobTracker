import fs from "node:fs/promises";
import path from "node:path";

const MASTER_RESUME_PATH =
  process.env.MASTER_RESUME_PATH ?? path.join(process.cwd(), "master-resume.json");

export async function getMasterResume(_input: unknown) {
  const text = await fs.readFile(MASTER_RESUME_PATH, "utf8");
  const masterResume = JSON.parse(text) as unknown;

  return {
    path: MASTER_RESUME_PATH,
    master_resume: masterResume,
  };
}
