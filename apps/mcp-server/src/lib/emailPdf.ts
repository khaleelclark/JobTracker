import nodemailer from "nodemailer";
import fs from "node:fs/promises";

interface EmailPdfOptions {
  pdfPath: string;
  fileName: string;
  to: string;
  from: string;
  subject?: string;
}

export async function emailPdf(options: EmailPdfOptions): Promise<void> {
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!appPassword) {
    throw new Error(
      "GMAIL_APP_PASSWORD is not set. Add it to your .env file to enable resume emailing."
    );
  }

  const pdfBuffer = await fs.readFile(options.pdfPath);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: options.from,
      pass: appPassword,
    },
  });

  await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject ?? `Resume: ${options.fileName}`,
    text: `Your tailored resume is attached: ${options.fileName}`,
    attachments: [
      {
        filename: options.fileName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
