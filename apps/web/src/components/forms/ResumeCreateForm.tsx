"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface SkillOption {
  id: string;
  name: string;
  category: string | null;
}

interface ResumeCreateFormProps {
  applications: ApplicationOption[];
  skills: SkillOption[];
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

export function ResumeCreateForm({ applications, skills }: ResumeCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    const selectedIds = data.getAll("linkedApplicationIds").map((value) => String(value));
    const selectedSkillIds = data.getAll("linkedSkillIds").map((value) => String(value));

    const payload: {
      name: string;
      filePath?: string;
      fileName?: string;
      fileBase64?: string;
      extractedText: string | null;
      linkedApplicationIds: string[];
      linkedSkillIds: string[];
    } = {
      name: String(data.get("name") ?? "").trim(),
      extractedText: String(data.get("extractedText") ?? "").trim() || null,
      linkedApplicationIds: selectedIds,
      linkedSkillIds: selectedSkillIds,
    };

    const filePath = String(data.get("filePath") ?? "").trim();
    if (filePath) {
      payload.filePath = filePath;
    }

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
      setSuccess("Resume saved.");
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
        <h2>Add Resume</h2>
        <p className="muted">Upload file content or provide an existing file path.</p>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Display Name
          <input name="name" required maxLength={200} placeholder="Resume - Product - Jan 2026" />
        </label>

        <label>
          Existing File Path (optional)
          <input name="filePath" maxLength={1000} placeholder="C:\\resumes\\pm.pdf" />
        </label>
      </div>

      <label>
        Upload File (optional)
        <input name="file" type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={onFileChange} />
      </label>

      <label>
        Link to Applications
        <select name="linkedApplicationIds" multiple size={Math.min(8, Math.max(3, applications.length))}>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.companyName} - {application.roleTitle}
            </option>
          ))}
        </select>
      </label>

      <label>
        Link to Master Skills
        <select name="linkedSkillIds" multiple size={Math.min(8, Math.max(3, skills.length))}>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
              {skill.category ? ` (${skill.category})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label>
        Extracted Text (optional)
        <textarea name="extractedText" rows={5} maxLength={50000} placeholder="Optional extracted text for search context" />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Resume"}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
