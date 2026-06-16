"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Button, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import DownloadIcon from "@mui/icons-material/Download";

interface ResumeOption {
  id: string;
  name: string;
}

interface LinkedResumeRow {
  resumeId: string;
  name: string;
}

interface ResumeLinkItem {
  resumeId: string;
  name: string;
}

interface ApplicationResumeLinksManagerProps {
  applicationId: string;
  linkedResumes: LinkedResumeRow[];
  allResumes: ResumeOption[];
}

export function ApplicationResumeLinksManager({
  applicationId,
  linkedResumes,
  allResumes,
}: ApplicationResumeLinksManagerProps) {
  const router = useRouter();
  const [linkedResumeIds, setLinkedResumeIds] = useState<string[]>(linkedResumes.map((entry) => entry.resumeId));
  const [pendingResumeId, setPendingResumeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) {
      return;
    }
    const timeoutId = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const linkedResumeMap = useMemo(() => {
    const byId = new Map<string, LinkedResumeRow>();
    for (const resume of linkedResumes) {
      byId.set(resume.resumeId, resume);
    }
    return byId;
  }, [linkedResumes]);

  const allResumeMap = useMemo(() => {
    const byId = new Map<string, ResumeOption>();
    for (const resume of allResumes) {
      byId.set(resume.id, resume);
    }
    return byId;
  }, [allResumes]);

  const selectedResumes: ResumeLinkItem[] = linkedResumeIds
    .map((resumeId) => {
      const linked = linkedResumeMap.get(resumeId);
      if (linked) {
        return { resumeId: linked.resumeId, name: linked.name };
      }
      const fallback = allResumeMap.get(resumeId);
      if (fallback) {
        return { resumeId: fallback.id, name: fallback.name };
      }
      return null;
    })
    .filter((entry): entry is ResumeLinkItem => Boolean(entry));

  const availableResumes = allResumes.filter((resume) => !linkedResumeIds.includes(resume.id));

  function addLink() {
    if (!pendingResumeId || linkedResumeIds.includes(pendingResumeId)) {
      return;
    }
    setLinkedResumeIds((current) => [...current, pendingResumeId]);
    setPendingResumeId("");
  }

  function removeLink(resumeId: string) {
    setLinkedResumeIds((current) => current.filter((id) => id !== resumeId));
  }

  async function saveLinks() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/resumes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedResumeIds }),
      });

      if (!response.ok) {
        throw new Error("Unable to update resume links");
      }

      setSuccess("Resume links updated.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      {selectedResumes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No linked resumes.</Typography>
      ) : (
        <List>
          {selectedResumes.map((resume) => (
            <ListItem
              key={resume.resumeId}
              disablePadding
              secondaryAction={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <IconButton size="small" title="Download" aria-label={`Download resume ${resume.name}`} component="a" href={`/api/resumes/${resume.resumeId}/download`}>
                    <DownloadIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Unlink" onClick={() => removeLink(resume.resumeId)} aria-label={`Unlink resume ${resume.name}`}>
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </Box>
              }
              sx={{ pr: "88px" }}
            >
              <Typography sx={{ px: "0.6rem", py: "0.7rem" }}>{resume.name}</Typography>
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          select
          label="Add resume"
          size="small"
          value={pendingResumeId}
          onChange={(e) => setPendingResumeId(e.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="" disabled>Select resume to link</MenuItem>
          {availableResumes.map((resume) => (
            <MenuItem key={resume.id} value={resume.id}>{resume.name}</MenuItem>
          ))}
        </TextField>
        <Button onClick={addLink} disabled={!pendingResumeId}>Add Link</Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button onClick={() => void saveLinks()} disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
          {saving ? "Saving..." : "Save Resume Links"}
        </Button>
        {success && <Typography variant="body2" color="success.main">{success}</Typography>}
        {error && <Typography variant="body2" color="error">{error}</Typography>}
      </Box>
    </Stack>
  );
}
