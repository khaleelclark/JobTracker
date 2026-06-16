"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";
import { fmtLocalDate, fmtLocalDateTime } from "@/lib/format";

interface TimelineEntry {
  id: string;
  label: string;
  occurredAtIso: string;
  applicationId?: string;
  dateOnly?: boolean;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  if (entries.length === 0) {
    return <Typography variant="body2" color="text.secondary">No recent activity.</Typography>;
  }

  return (
    <List>
      {entries.map((entry) => {
        const dateStr = entry.dateOnly
          ? fmtLocalDate(entry.occurredAtIso)
          : fmtLocalDateTime(entry.occurredAtIso);

        const inner = (
          <>
            <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: "1.05rem" }} title={entry.label}>
              {entry.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
              {dateStr}
            </Typography>
          </>
        );

        return (
          <ListItem key={entry.id} disablePadding>
            {entry.applicationId ? (
              <ListItemButton
                component={Link}
                href={`/applications/${entry.applicationId}`}
                sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
              >
                {inner}
              </ListItemButton>
            ) : (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, px: "0.6rem", py: "0.7rem", width: "100%" }}>
                {inner}
              </Box>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}
