// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_CHROME_CANDIDATES = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser"
];

export async function generateResumePdf(resume, options = {}) {
  validateResume(resume);

  const outputPdfPath = path.resolve(options.outputPdfPath || "generated/resume.pdf");
  const shouldKeepHtml = Boolean(options.outputHtmlPath);
  const outputHtmlPath = shouldKeepHtml
    ? path.resolve(options.outputHtmlPath)
    : path.join(await fs.mkdtemp(path.join(os.tmpdir(), "resume-pdf-")), "resume.html");

  const html = renderResumeHtml(resume);

  await fs.mkdir(path.dirname(outputHtmlPath), { recursive: true });
  await fs.mkdir(path.dirname(outputPdfPath), { recursive: true });
  await fs.writeFile(outputHtmlPath, html, "utf8");

  const chromePath = await resolveChromePath(options.chromePath);
  const htmlUrl = pathToFileUrl(outputHtmlPath);

  try {
    await execFileAsync(chromePath, [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${outputPdfPath}`,
      htmlUrl
    ]);
  } finally {
    if (!shouldKeepHtml) {
      await fs.rm(path.dirname(outputHtmlPath), { force: true, recursive: true });
    }
  }

  return {
    pdfPath: outputPdfPath,
    htmlPath: shouldKeepHtml ? outputHtmlPath : null
  };
}

export function renderResumeHtml(resume) {
  const sections = Array.isArray(resume.sections) ? resume.sections : [];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(resume.name)} Resume</title>
  <style>
    @page {
      size: Letter;
      margin: 0.45in 0.55in;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.6pt;
      line-height: 1.22;
    }

    header {
      text-align: center;
      margin-bottom: 8px;
    }

    h1 {
      margin: 0 0 3px;
      color: #0b3d2e;
      font-size: 18pt;
      line-height: 1;
      letter-spacing: 0;
    }

    .contact,
    .citizenship {
      font-size: 9.2pt;
    }

    .citizenship {
      margin-top: 2px;
    }

    a {
      color: #0b3d2e;
      text-decoration: none;
    }

    section {
      margin-top: 7px;
    }

    h2 {
      margin: 0 0 4px;
      padding-bottom: 1px;
      color: #2f7d57;
      border-bottom: 1px solid #2f7d57;
      font-size: 10.7pt;
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .item {
      margin-top: 5px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .item-head,
    .subline {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
    }

    .item-head {
      font-size: 9.8pt;
      line-height: 1.15;
    }

    .subline {
      margin-top: 1px;
      font-style: italic;
    }

    .title {
      font-weight: 700;
    }

    .meta {
      text-align: right;
      white-space: nowrap;
    }

    ul {
      margin: 2px 0 0 16px;
      padding: 0;
    }

    li {
      margin: 1.4px 0;
      padding-left: 1px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }

    .skills li {
      margin: 1.8px 0;
    }
  </style>
</head>
<body>
  ${renderHeader(resume)}
  ${sections.map(renderSection).join("\n")}
</body>
</html>
`;
}

function renderHeader(resume) {
  const contactParts = [
    resume.location,
    resume.phone,
    resume.email ? `<a href="mailto:${escapeAttribute(resume.email)}">${escapeHtml(resume.email)}</a>` : "",
    resume.linkedin ? link(resume.linkedin, displayUrl(resume.linkedin)) : "",
    resume.github ? link(resume.github, displayUrl(resume.github)) : "",
    resume.portfolio ? link(resume.portfolio, displayUrl(resume.portfolio)) : ""
  ].filter(Boolean);

  return `<header>
    <h1>${escapeHtml(resume.name)}</h1>
    <div class="contact">${contactParts.join(" | ")}</div>
    ${resume.citizenship ? `<div class="citizenship">${escapeHtml(resume.citizenship)}</div>` : ""}
  </header>`;
}

function renderSection(section) {
  const sectionName = section.name || "";
  const items = Array.isArray(section.items) ? section.items : [];
  const className = isTechnicalSkills(sectionName) ? ' class="skills"' : "";

  return `<section${className}>
    <h2>${escapeHtml(sectionName)}</h2>
    ${isTechnicalSkills(sectionName) ? renderSkills(items) : items.map(renderItem).join("\n")}
  </section>`;
}

function renderSkills(items) {
  const bullets = items.map((item) => {
    if (item.title && Array.isArray(item.bullets)) {
      return `<li><strong>${stripMarkdownBold(item.title)}:</strong> ${item.bullets.map(escapeHtml).join(", ")}</li>`;
    }

    return (item.bullets || []).map((bullet) => `<li>${renderInlineMarkdown(bullet)}</li>`).join("\n");
  });

  return `<ul>
      ${bullets.join("\n")}
    </ul>`;
}

function renderItem(item) {
  const title = item.title || "";
  const titleLine = [title ? `<span class="title">${escapeHtml(title)}</span>` : "", item.sub_title ? escapeHtml(item.sub_title) : ""]
    .filter(Boolean)
    .join(" | ");
  const dateRange = formatDateRange(item.start_date, item.end_date);
  const sublineLeft = item.position ? escapeHtml(item.position) : "";
  const sublineRight = item.link ? linkLabel(item.link) : "";
  const hasSubline = sublineLeft || sublineRight;

  return `<div class="item">
      <div class="item-head">
        <div>${titleLine}</div>
        <div class="meta">${escapeHtml(dateRange)}</div>
      </div>
      ${hasSubline ? `<div class="subline">
        <div>${sublineLeft}</div>
        <div class="meta">${renderMetaLinkOrText(sublineRight, item.link)}</div>
      </div>` : ""}
      ${renderBullets(item.bullets)}
    </div>`;
}

function renderBullets(bullets) {
  if (!Array.isArray(bullets) || bullets.length === 0) {
    return "";
  }

  return `<ul>
        ${bullets.map((bullet) => `<li>${renderInlineMarkdown(bullet)}</li>`).join("\n")}
      </ul>`;
}

function renderMetaLinkOrText(value, href) {
  if (!value) {
    return "";
  }

  if (href && value === linkLabel(href)) {
    return link(href, value);
  }

  return escapeHtml(value);
}

function formatDateRange(startDate, endDate) {
  if (startDate && endDate) {
    return `${startDate} – ${endDate}`;
  }

  return startDate || endDate || "";
}

function isTechnicalSkills(sectionName) {
  return sectionName.toLowerCase().includes("technical skills");
}

function link(href, label) {
  return `<a href="${escapeAttribute(href)}">${escapeHtml(label)}</a>`;
}

function linkLabel(url) {
  if (!url) {
    return "";
  }

  return displayUrl(url);
}

function displayUrl(url) {
  return String(url)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/i, "");
}

function stripMarkdownBold(value) {
  return escapeHtml(String(value).replace(/\*\*/g, ""));
}

function renderInlineMarkdown(value) {
  return escapeHtml(String(value)).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath);
  const prefix = process.platform === "win32" ? "file:///" : "file://";
  return prefix + resolved.split(path.sep).map(encodeURIComponent).join("/");
}

async function resolveChromePath(explicitPath) {
  if (explicitPath) {
    return explicitPath;
  }

  const candidates = process.env.CHROME_PATH
    ? [process.env.CHROME_PATH, ...DEFAULT_CHROME_CANDIDATES]
    : DEFAULT_CHROME_CANDIDATES;

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["--version"]);
      return candidate;
    } catch {
      // Try the next common Chrome binary name.
    }
  }

  throw new Error("Could not find a Chrome or Chromium executable. Set CHROME_PATH to the browser binary.");
}

function validateResume(resume) {
  if (!resume || typeof resume !== "object") {
    throw new TypeError("resume must be an object");
  }

  if (!resume.name) {
    throw new TypeError("resume.name is required");
  }

  if (!Array.isArray(resume.sections)) {
    throw new TypeError("resume.sections must be an array");
  }
}
