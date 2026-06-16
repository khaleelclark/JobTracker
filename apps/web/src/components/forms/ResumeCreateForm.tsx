"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { Autocomplete, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

interface ApplicationOption { id: string; companyName: string; roleTitle: string; }

interface ResumeCreateFormProps {
  applications: ApplicationOption[];
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = raw.indexOf(",");
      if (commaIdx === -1) { reject(new Error("Unable to read file as base64")); return; }
      resolve(raw.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export function ResumeCreateForm({ applications }: ResumeCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<ApplicationOption[]>([]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload: { name: string; fileName?: string; fileBase64?: string; extractedText: string | null; linkedApplicationIds: string[] } = {
      name: String(data.get("name") ?? "").trim(),
      extractedText: String(data.get("extractedText") ?? "").trim() || null,
      linkedApplicationIds: selectedApplications.map(a => a.id),
    };

    try {
      if (selectedFile) {
        payload.fileName = selectedFile.name;
        payload.fileBase64 = await readFileAsBase64(selectedFile);
      }
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save resume");
      }
      form.reset();
      setSelectedFile(null);
      setSelectedApplications([]);
      setSuccess("Resume saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        transition: "box-shadow 220ms ease, transform 220ms ease",
        "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h2">Add Resume</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Upload a resume file and link it to applications.
          </Typography>
        </Box>

        <TextField label="Display Name" name="name" required size="small" fullWidth
          placeholder="Resume - Product - Jan 2026"
          slotProps={{ htmlInput: { maxLength: 200 } }} />

        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Upload File (optional)
          </Typography>
          <input type="file" name="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={onFileChange}
            style={{ font: "inherit", fontSize: "0.9rem" }} />
        </Box>

        <Autocomplete
          multiple
          options={applications}
          getOptionLabel={o => `${o.companyName} - ${o.roleTitle}`}
          value={selectedApplications}
          onChange={(_, val) => setSelectedApplications(val)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderOption={(props, option) => <li {...props} key={option.id}>{option.companyName} - {option.roleTitle}</li>}
          renderInput={params => <TextField {...params} label="Link to Applications" size="small" />}
        />

        <TextField multiline rows={5} label="Extracted Text (optional)" name="extractedText" size="small" fullWidth
          placeholder="Optional extracted text for search context"
          slotProps={{ htmlInput: { maxLength: 50000 } }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button type="submit" disabled={submitting} endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save Resume"}
          </Button>
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
