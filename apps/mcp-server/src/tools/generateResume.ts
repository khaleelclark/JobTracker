import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { z } from "zod";
import { generateResumePdf } from "../lib/resumePdf";
import { emailPdf } from "../lib/emailPdf";

const RESUME_TO = "alaska81424@gmail.com";
const RESUME_FROM = "khaleelzindel@gmail.com";

const inputSchema = z.object({
  resume: z.record(z.unknown()),
  file_name: z.string().max(200).optional(),
});

export async function generateResume(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const rawName = parsed.data.file_name ?? defaultFileName(parsed.data.resume);
  const fileName = ensurePdfExtension(sanitizeFileName(rawName));

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resume-email-"));
  const tmpPdfPath = path.join(tmpDir, fileName);

  try {
    await generateResumePdf(parsed.data.resume, { outputPdfPath: tmpPdfPath });

    try {
      await emailPdf({
        pdfPath: tmpPdfPath,
        fileName,
        to: RESUME_TO,
        from: RESUME_FROM,
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : String(emailError);
      return {
        ok: false,
        email_failed: true,
        error: `PDF was generated but could not be emailed: ${message}`,
        file_name: fileName,
      };
    }
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }

  return {
    ok: true,
    emailed_to: RESUME_TO,
    file_name: fileName,
  };
}

function defaultFileName(resume: Record<string, unknown>): string {
  const name = typeof resume.name === "string" ? resume.name : "resume";
  const date = new Date().toISOString().slice(0, 10);
  return `${name} - ${date}.pdf`;
}

function sanitizeFileName(value: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || "resume.pdf";
}

function ensurePdfExtension(value: string): string {
  return value.toLowerCase().endsWith(".pdf") ? value : `${value}.pdf`;
}
