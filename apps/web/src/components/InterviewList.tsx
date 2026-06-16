"use client";

import Link from "next/link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { toTitleCaseLabel } from "@/lib/format";

interface InterviewItem {
  id: string;
  applicationId: string;
  applicationCompany: string;
  roundLabel: string;
  scheduledAtIso: string;
  status: string;
}

interface InterviewListProps {
  interviews: InterviewItem[];
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function InterviewList({ interviews }: InterviewListProps) {
  if (interviews.length === 0) {
    return <Typography variant="body2" color="text.secondary">No upcoming interviews.</Typography>;
  }

  return (
    <List>
      {interviews.map((interview) => (
        <ListItem key={interview.id} disablePadding>
          <ListItemButton
            component={Link}
            href={`/applications/${interview.applicationId}`}
            sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
          >
            <Typography component="span">
              <strong>{interview.applicationCompany}</strong> — {interview.roundLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {fmtTime(interview.scheduledAtIso)} ({toTitleCaseLabel(interview.status)})
            </Typography>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
