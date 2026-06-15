"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface ResumeCreateFormProps {
  applications: ApplicationOption[];
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = raw.indexOf(",");
      if (commaIdx === -1) {
        reject(new Error("Unable to read file as base64"));
        return;
      }
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
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const selectedIds = selectedApplications.map((a) => a.id);

    const payload: {
      name: string;

      fileName?: string;
      fileBase64?: string;
      extractedText: string | null;
      linkedApplicationIds: string[];
    } = {
      name: String(data.get("name") ?? "").trim(),
      extractedText: String(data.get("extractedText") ?? "").trim() || null,
      linkedApplicationIds: selectedIds,
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
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        throw new Error(
          typeof body.error === "string" ? body.error : "Unable to save resume",
        );
      }

      form.reset();
      setSelectedFile(null);
      setSelectedApplications([]);
      setSuccess("Resume saved.");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Add Resume</h2>
        <p className="muted">
          Upload a resume file and link it to applications.
        </p>
      </div>

      <label>
        Display Name
        <input
          name="name"
          required
          maxLength={200}
          placeholder="Resume - Product - Jan 2026"
        />
      </label>

      <label>
        Upload File (optional)
        <input
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          onChange={onFileChange}
        />
      </label>

      <Autocomplete
        multiple
        options={applications}
        getOptionLabel={(o) => `${o.companyName} - ${o.roleTitle}`}
        value={selectedApplications}
        onChange={(_, val) => setSelectedApplications(val)}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.companyName} - {option.roleTitle}</li>}
        renderInput={(params) => <TextField {...params} label="Link to Applications" size="small" />}
      />

      <label>
        Extracted Text (optional)
        <textarea
          name="extractedText"
          rows={5}
          maxLength={50000}
          placeholder="Optional extracted text for search context"
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (
            "Saving..."
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              Save Resume
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
