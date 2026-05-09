import path from "node:path";
import { z } from "zod";
import { generateResumePdf } from "../lib/resumePdf";

const GENERATED_RESUME_DIR =
  process.env.GENERATED_RESUME_DIR ?? "/home/khaleel/Generated Resumes";

const inputSchema = z.object({
  resume: z.record(z.unknown()),
  file_name: z.string().min(1).max(160).optional(),
});

export async function generateResume(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const fileName = ensurePdfExtension(
    sanitizeFileName(parsed.data.file_name ?? defaultFileName(parsed.data.resume))
  );
  const outputPdfPath = path.join(GENERATED_RESUME_DIR, fileName);
  const result = await generateResumePdf(parsed.data.resume, { outputPdfPath });

  return {
    ok: true,
    pdf_path: result.pdfPath,
    output_directory: GENERATED_RESUME_DIR,
  };
}

function defaultFileName(resume: Record<string, unknown>): string {
  const name = typeof resume.name === "string" ? resume.name : "resume";
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "-");

  return `${name} ${timestamp}.pdf`;
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
