export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GoalsProfileForm } from "@/components/forms/GoalsProfileForm";
import { DEFAULT_GOALS_PROFILE } from "@/lib/goalsProfile";
import { prisma } from "@/lib/db";

export default async function GoalsPage() {
  const row = await prisma.goalsProfile.findUnique({ where: { id: "singleton" } });

  const profile = row
    ? {
        missionStatement: row.missionStatement,
        weeklyApplicationsTarget: row.weeklyApplicationsTarget,
        compensationPreference: row.compensationPreference,
        preferredLocations: row.preferredLocations,
        employmentTypes: JSON.parse(row.employmentTypes) as string[],
        workplaceModes: JSON.parse(row.workplaceModes) as string[],
        priorityNotes: row.priorityNotes,
      }
    : DEFAULT_GOALS_PROFILE;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Goals</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Define mission, preferences, and job-search priorities for AI-assisted analysis.
        </Typography>
      </Box>

      <GoalsProfileForm initialProfile={profile} />
    </Stack>
  );
}
