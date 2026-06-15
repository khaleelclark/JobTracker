export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { prisma } from "@/lib/db";
import { ResumeCreateForm } from "@/components/forms/ResumeCreateForm";
import { ResumeLibrary } from "@/components/ResumeLibrary";

export default async function ResumesPage() {
  const [resumes, applications] = await Promise.all([
    prisma.resume.findMany({
      orderBy: { createdAt: "desc" },
      include: { applications: { include: { application: true } } },
    }),
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, companyName: true, roleTitle: true },
    }),
  ]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Resumes</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Store resume files and link them to applications.
        </Typography>
      </Box>

      <ResumeCreateForm applications={applications} />

      <Paper
        sx={{
          transition: "box-shadow 220ms ease, transform 220ms ease",
          "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="h2">Resume Library</Typography>
          <ResumeLibrary
            resumes={resumes.map(resume => ({
              id: resume.id,
              name: resume.name,
              filePath: resume.filePath,
              extractedText: resume.extractedText,
              linkedApplicationIds: resume.applications.map(entry => entry.applicationId),
            }))}
            applications={applications}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
