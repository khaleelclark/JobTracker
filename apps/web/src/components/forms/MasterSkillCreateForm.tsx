"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormControl, InputLabel, MenuItem, OutlinedInput, Select, SelectChangeEvent } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

interface ResumeOption {
  id: string;
  name: string;
}

interface MasterSkillCreateFormProps {
  resumes: ResumeOption[];
}

export function MasterSkillCreateForm({ resumes }: MasterSkillCreateFormProps) {
  const router = useRouter();
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedResumeIds, setLinkedResumeIds] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      category: String(data.get("category") ?? "").trim() || null,
      notes: String(data.get("notes") ?? "").trim() || null,
      linkedResumeIds,
    };

    try {
      const response = await fetch("/api/master-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save skill");
      }

      form.reset();
      setLinkedResumeIds([]);
      setSuccess("Skill saved.");
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Add Master Skill</h2>
        <p className="muted">Store your canonical skill inventory as structured facts.</p>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Skill Name
          <input name="name" required maxLength={120} placeholder="TypeScript" />
        </label>

        <label>
          Category (optional)
          <input name="category" maxLength={120} placeholder="Programming Language" />
        </label>
      </div>

      <div className="form-grid form-grid-2">
        <FormControl>
          <InputLabel id="create-skill-linked-resumes-label">Link Resumes (optional)</InputLabel>
          <Select<string[]>
            labelId="create-skill-linked-resumes-label"
            multiple
            value={linkedResumeIds}
            onChange={(event: SelectChangeEvent<string[]>) => {
              const value = event.target.value;
              setLinkedResumeIds(typeof value === "string" ? value.split(",") : value);
            }}
            input={<OutlinedInput label="Link Resumes (optional)" />}
            renderValue={(selected) =>
              resumes
                .filter((resume) => selected.includes(resume.id))
                .map((resume) => resume.name)
                .join(", ")
            }
          >
            {resumes.map((resume) => (
              <MenuItem key={resume.id} value={resume.id}>
                {resume.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <label>
          Notes (optional)
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Context, projects, certifications, or proof points"
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save Skill
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
