import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function resolveDataDir(): string {
  if (process.env.JOBTRACKER_DATA_DIR) {
    return path.resolve(process.env.JOBTRACKER_DATA_DIR);
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, "job-tracker") : path.join(os.homedir(), "AppData", "Roaming", "job-tracker");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "job-tracker");
  }

  return path.join(os.homedir(), ".local", "share", "job-tracker");
}

async function ensureFile(pathName: string, text: string): Promise<void> {
  try {
    await fs.access(pathName);
  } catch {
    await fs.writeFile(pathName, text, "utf8");
  }
}

async function main() {
  const dataDir = resolveDataDir();
  const resumeDir = path.join(dataDir, "resumes");
  const masterResumeDir = path.join(dataDir, "master-resumes");
  const backupDir = path.join(dataDir, "backups");
  const controlFile = path.join(dataDir, "control.txt");

  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(resumeDir, { recursive: true });
  await fs.mkdir(masterResumeDir, { recursive: true });
  await fs.mkdir(backupDir, { recursive: true });

  await ensureFile(
    controlFile,
    "GOALS\n\nCONSTRAINTS\n\nFOLLOW UP STRATEGY\n\nEXPERIMENTS\n\nOBSERVATIONS\n\nQUESTIONS FOR GPT\n\nSYSTEM NOTES\n",
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ dataDir, resumeDir, masterResumeDir, backupDir, controlFile }, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
