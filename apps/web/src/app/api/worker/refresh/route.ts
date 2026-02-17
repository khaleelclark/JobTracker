import { NextResponse } from "next/server";
import { queueWorkerRun, runWorkerOnce } from "@/server/worker/llmWorker";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const forceFromQuery = url.searchParams.get("force") === "1";

  let forceFromBody = false;
  try {
    const body = (await request.json()) as { force?: unknown };
    forceFromBody = body?.force === true;
  } catch {
    forceFromBody = false;
  }

  await queueWorkerRun();
  const result = await runWorkerOnce({ force: forceFromQuery || forceFromBody });
  return NextResponse.json({ result });
}
