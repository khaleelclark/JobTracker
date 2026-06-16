"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { ApplicationStatusPill } from "@/components/ApplicationStatusPill";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cleanPostingText } from "@/lib/format";

interface ApplicationHeaderProps {
  applicationId: string;
  companyName: string;
  roleTitle: string;
  genericStatus: string;
  compensation: string | null;
  careersPageUrl: string | null;
  postingDetails: string | null;
  notes: string | null;
}

export function ApplicationHeader({
  applicationId,
  companyName,
  roleTitle,
  genericStatus,
  compensation,
  careersPageUrl,
  postingDetails,
  notes,
}: ApplicationHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
      <Stack spacing={1.5}>
        <Typography variant="h1">{companyName}</Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography>{roleTitle}</Typography>
          <ApplicationStatusPill applicationId={applicationId} initialStatus={genericStatus} />
        </Box>

        {compensation && (
          <Typography variant="body2" color="text.secondary">Compensation: {compensation}</Typography>
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Button
            startIcon={<ExpandMoreIcon sx={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />}
            onClick={() => setOpen((v) => !v)}
            sx={{ opacity: 0.8 }}
          >
            {open ? "Hide Posting Details" : "Show Posting Details"}
          </Button>

          {careersPageUrl && (
            <Button
              component="a"
              href={careersPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon sx={{ fontSize: "0.85rem !important" }} />}
              sx={{ opacity: 0.8 }}
            >
              Open Careers Page
            </Button>
          )}
        </Box>

        {open && (
          <>
            <Divider />
            <Stack spacing={1.5}>
              {postingDetails ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {cleanPostingText(postingDetails)}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">No posting details.</Typography>
              )}
              {notes && (
                <>
                  <Typography variant="h3">Notes</Typography>
                  <MarkdownContent markdown={notes} />
                </>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
