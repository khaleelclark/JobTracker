export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { prisma } from "@/lib/db";
import { InterviewsSection } from "@/components/InterviewsSection";

export default async function InterviewsPage() {
  const [interviews, applications] = await Promise.all([
    prisma.interview.findMany({
      orderBy: { scheduledAt: "desc" },
      include: { application: true },
    }),
    prisma.application.findMany({
      where: { genericStatus: { notIn: ["rejected", "withdrawn", "archived"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
  ]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Interviews</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Track round details and outcomes as they occur.
        </Typography>
      </Box>

      <InterviewsSection
        applications={applications}
        interviews={interviews.map(interview => ({
          id: interview.id,
          applicationId: interview.applicationId,
          companyName: interview.application.companyName,
          roundIndex: interview.roundIndex,
          roundLabel: interview.roundLabel,
          scheduledAtIso: interview.scheduledAt.toISOString(),
          status: interview.status as "scheduled" | "completed" | "cancelled",
          notes: interview.notes ?? null,
        }))}
      />
    </Stack>
  );
}
