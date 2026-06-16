export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DbPathPicker } from "@/components/DbPathPicker";

export default async function SettingsPage() {
  const currentUrl = process.env.DATABASE_URL ?? "";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Settings</Typography>
      </Box>

      <Paper
        sx={{
          transition: "box-shadow 220ms ease, transform 220ms ease",
          "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
        }}
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h2">Database</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Path to the active SQLite database. In Docker, changes restart the container.
            </Typography>
          </Box>
          <DbPathPicker currentUrl={currentUrl} />
        </Stack>
      </Paper>
    </Stack>
  );
}
