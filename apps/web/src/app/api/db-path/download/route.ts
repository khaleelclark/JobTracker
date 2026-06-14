import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbPath = dbUrl.replace(/^file:/, "");

  if (!dbPath || !fs.existsSync(dbPath)) {
    return Response.json({ error: "Database not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(dbPath);
  const filename = path.basename(dbPath);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
