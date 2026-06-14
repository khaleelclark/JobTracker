import path from "node:path";
import { z } from "zod";
import { generateResumePdf } from "../lib/resumePdf";
import { resolveGeneratedResumeDir } from "../lib/paths";

const inputSchema = z.object({
  resume: z.record(z.unknown()),
  file_name: z.string().max(200).optional(),
});

export async function generateResume(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const outputDir = resolveGeneratedResumeDir();
  const rawName = parsed.data.file_name ?? defaultFileName(parsed.data.resume);
  const fileName = ensurePdfExtension(sanitizeFileName(rawName));
  const outputPdfPath = path.join(outputDir, fileName);

  const result = await generateResumePdf(parsed.data.resume, { outputPdfPath });

  return {
    ok: true,
    file_name: fileName,
    pdf_path: result.pdfPath,
    output_directory: outputDir,
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
