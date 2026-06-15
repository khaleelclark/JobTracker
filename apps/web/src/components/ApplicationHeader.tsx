"use client";

import { useState } from "react";
import { ApplicationStatusPill } from "@/components/ApplicationStatusPill";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cleanPostingText } from "@/lib/format";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

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

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  textDecoration: "none",
  border: "none",
  background: "none",
  color: "var(--brand-strong)",
  borderRadius: "10px",
  padding: "0.43rem 0.75rem",
  lineHeight: 1.2,
  fontSize: "0.875rem",
  cursor: "pointer",
  opacity: 0.8,
};

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
    <div className="card stack-md">
      <h1 className="no-margin">{companyName}</h1>
      <p>
        {roleTitle} -{" "}
        <ApplicationStatusPill applicationId={applicationId} initialStatus={genericStatus} />
      </p>
      {compensation ? <p className="muted">Compensation: {compensation}</p> : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" style={btnStyle} onClick={() => setOpen((v) => !v)}>
          <ExpandMoreIcon
            sx={{
              fontSize: "1rem",
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
          {open ? "Hide Posting Details" : "Show Posting Details"}
        </button>

        {careersPageUrl ? (
          <a href={careersPageUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
            Open Careers Page
            <OpenInNewIcon sx={{ fontSize: "0.85rem" }} />
          </a>
        ) : null}
      </div>

      {open ? (
        <div className="stack-md" style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}>
          {postingDetails ? (
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.9rem", margin: 0 }}>
              {cleanPostingText(postingDetails)}
            </p>
          ) : (
            <p className="muted">No posting details.</p>
          )}
          {notes ? (
            <>
              <h3>Notes</h3>
              <MarkdownContent markdown={notes} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
