export interface GoalsProfile {
  missionStatement: string;
  weeklyApplicationsTarget: number | null;
  compensationPreference: string;
  preferredLocations: string;
  employmentTypes: string[];
  workplaceModes: string[];
  priorityNotes: string;
}

export const DEFAULT_GOALS_PROFILE: GoalsProfile = {
  missionStatement: "",
  weeklyApplicationsTarget: null,
  compensationPreference: "",
  preferredLocations: "",
  employmentTypes: [],
  workplaceModes: [],
  priorityNotes: "",
};

const START_MARKER = "JOB SEARCH PROFILE";
const END_MARKER = "END JOB SEARCH PROFILE";

function parseMaybeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseMaybeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function parseMaybeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.trunc(value);
  if (rounded < 1 || rounded > 200) {
    return null;
  }

  return rounded;
}

export function parseGoalsProfile(controlText: string): GoalsProfile | null {
  const blockPattern = new RegExp(`${START_MARKER}[\\s\\S]*?\\\`\\\`\\\`json\\n([\\s\\S]*?)\\n\\\`\\\`\\\`[\\s\\S]*?${END_MARKER}`);
  const match = controlText.match(blockPattern);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    return {
      missionStatement: parseMaybeString(parsed.missionStatement),
      weeklyApplicationsTarget: parseMaybeNumber(parsed.weeklyApplicationsTarget),
      compensationPreference: parseMaybeString(parsed.compensationPreference),
      preferredLocations: parseMaybeString(parsed.preferredLocations),
      employmentTypes: parseMaybeStringArray(parsed.employmentTypes),
      workplaceModes: parseMaybeStringArray(parsed.workplaceModes),
      priorityNotes: parseMaybeString(parsed.priorityNotes),
    };
  } catch {
    return null;
  }
}

export function serializeGoalsProfile(profile: GoalsProfile): string {
  return `${START_MARKER}
\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`
${END_MARKER}
`;
}

export function upsertGoalsProfile(controlText: string, profile: GoalsProfile): string {
  const serializedBlock = serializeGoalsProfile(profile);
  const blockPattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, "m");

  if (blockPattern.test(controlText)) {
    return controlText.replace(blockPattern, `${serializedBlock}\n`);
  }

  const trimmed = controlText.trimEnd();
  return `${trimmed}\n\n${serializedBlock}\n`;
}
