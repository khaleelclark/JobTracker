import fs from "node:fs/promises";
import { resolveControlFilePath } from "../lib/paths";
import { truncateJsonString } from "../lib/truncate";
import { prisma } from "../lib/db";

export async function getControlFile() {
  const path = resolveControlFilePath();

  const [text, goalsRow] = await Promise.all([
    fs.readFile(path, "utf8").catch(() => ""),
    prisma.goalsProfile.findUnique({ where: { id: "singleton" } }).catch(() => null),
  ]);

  const goals = goalsRow
    ? {
        missionStatement: goalsRow.missionStatement,
        weeklyApplicationsTarget: goalsRow.weeklyApplicationsTarget,
        compensationPreference: goalsRow.compensationPreference,
        preferredLocations: goalsRow.preferredLocations,
        employmentTypes: JSON.parse(goalsRow.employmentTypes) as string[],
        workplaceModes: JSON.parse(goalsRow.workplaceModes) as string[],
        priorityNotes: goalsRow.priorityNotes,
      }
    : null;

  return {
    control_file: { path, text: truncateJsonString(text, 5000) },
    goals_profile: goals,
  };
}
