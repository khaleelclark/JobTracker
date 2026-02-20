"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";

interface ResumeOption {
  id: string;
  name: string;
}

interface MasterSkillGenerateFromResumeFormProps {
  resumes: ResumeOption[];
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsText(file);
  });
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

export function MasterSkillGenerateFromResumeForm({ resumes }: MasterSkillGenerateFromResumeFormProps) {
  const router = useRouter();
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState("");

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  function startMessageTimeout() {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setResult(null);
      setError(null);
    }, 3500);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const resumeId = selectedResumeId.trim();
    const resumeTextInput = String(data.get("resumeText") ?? "").trim();

    try {
      let uploadedText = "";
      let uploadedFileName = "";
      let uploadedFileBase64 = "";
      if (selectedFile) {
        const lowerName = selectedFile.name.toLowerCase();
        if (lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".text")) {
          uploadedText = (await readFileAsText(selectedFile)).trim();
        } else {
          uploadedFileName = selectedFile.name;
          uploadedFileBase64 = await readFileAsBase64(selectedFile);
        }
      }

      const payload: {
        resumeId?: string;
        resumeText?: string;
        linkResumeId?: string;
        uploadedFileName?: string;
        uploadedFileBase64?: string;
      } = {};

      if (resumeId) {
        payload.resumeId = resumeId;
        payload.linkResumeId = resumeId;
      }

      const effectiveText = uploadedText || resumeTextInput;
      if (effectiveText) {
        payload.resumeText = effectiveText;
      }

      if (uploadedFileName && uploadedFileBase64) {
        payload.uploadedFileName = uploadedFileName;
        payload.uploadedFileBase64 = uploadedFileBase64;
      }

      const response = await fetch("/api/master-skills/generate-from-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        generated?: number;
        matchedExisting?: number;
        linked?: number;
      };

      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Unable to generate skills");
      }

      const generated = body.generated ?? 0;
      const matchedExisting = body.matchedExisting ?? 0;
      const linked = body.linked ?? 0;
      setResult(`Generated ${generated} new skill(s), matched ${matchedExisting} existing, linked ${linked}.`);
      startMessageTimeout();
      form.reset();
      setSelectedResumeId("");
      setSelectedFile(null);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
      startMessageTimeout();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Generate Skills From Resume</h2>
        <p className="muted">Use a saved resume or upload/paste resume text to auto-create known skills.</p>
      </div>

      <FormControl>
        <InputLabel id="generate-skills-resume-label">Resume In Library</InputLabel>
        <Select
          labelId="generate-skills-resume-label"
          value={selectedResumeId}
          label="Resume In Library"
          onChange={(event: SelectChangeEvent<string>) => {
            setSelectedResumeId(event.target.value);
          }}
          sx={{ borderRadius: "14px" }}
        >
          <MenuItem value="">None selected</MenuItem>
          {resumes.map((resume) => (
            <MenuItem key={resume.id} value={resume.id}>
              {resume.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <label>
        Upload Resume File (optional)
        <input name="resumeFile" type="file" accept=".txt,.md,.text,.pdf,.doc,.docx" onChange={onFileChange} />
      </label>

      <label>
        Or Paste Resume Text (optional)
        <textarea
          name="resumeText"
          rows={5}
          maxLength={100000}
          placeholder="Paste resume text here if extracted text is not available"
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Generating..." : "Generate Skills"}
        </button>
        {result ? <span className="success-text">{result}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>

      <p className="muted">
        Disclaimer: generated skills may be imperfect. Review and edit entries before using them in resume submissions.
      </p>
    </form>
  );
}
