export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { prisma } from "@/lib/db";
import { ApplicationCommunicationSection } from "@/components/ApplicationCommunicationSection";

export default async function EmailsPage() {
  const [emails, applications] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { application: true },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
  ]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Communication Logs</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Store communication history for context and follow-through.
        </Typography>
      </Box>

      <ApplicationCommunicationSection
        applications={applications}
        defaultApplicationId={applications[0]?.id ?? ""}
        communicationLogs={emails.map(email => ({
          id: email.id,
          applicationId: email.applicationId,
          companyName: email.companyName ?? email.application?.companyName ?? "Unknown Company",
          channel: email.channel,
          direction: email.direction,
          isHuman: email.isHuman,
          subject: email.subject,
          body: email.body,
          notes: email.notes,
          createdAtIso: email.createdAt.toISOString(),
        }))}
      />
    </Stack>
  );
}
