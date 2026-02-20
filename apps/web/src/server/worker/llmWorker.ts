import { LOCAL_TRIAGE_CARD_TYPES, addHours } from "@job-tracker/shared";
import { ensureDataLayout } from "@/lib/fileStore";
import { prisma } from "@/lib/db";
import { getLlmAdapter } from "./llmAdapters";
import { validateWorkerOutput } from "./outputValidate";
import { beginRun, canRunNow, finishRun, isPending, markWorkerPending } from "./runQueue";
import { buildSnapshot } from "./snapshot";

interface RunOptions {
  force?: boolean;
}

const promptOnlyMode = (process.env.LOCAL_LLM_PROMPT_ONLY ?? "true").toLowerCase() !== "false";

export async function queueWorkerRun(): Promise<void> {
  await markWorkerPending();
}

export async function runWorkerOnce(options: RunOptions = {}): Promise<{ created: number; skippedReason?: string }> {
  await ensureDataLayout();

  if (promptOnlyMode) {
    await enforcePromptOnlyCardPolicy();
  }

  const pending = await isPending();
  if (!options.force && !pending) {
    return { created: 0, skippedReason: "not_pending" };
  }

  const gate = await canRunNow();
  if (!options.force && !gate.allowed) {
    return { created: 0, skippedReason: gate.reason };
  }

  const startedAt = new Date();
  const llmRun = await prisma.llmRun.create({
    data: {
      startedAt,
      cardsCreatedCount: 0,
    },
  });

  await beginRun(startedAt);

  try {
    const snapshot = await buildSnapshot();
    const adapter = getLlmAdapter();
    const raw = await adapter.generateCards(snapshot);
    const validation = await validateWorkerOutput(raw);

    let created = 0;
    let duplicateSkipped = 0;
    for (const card of validation.accepted) {
      try {
        await prisma.uiCard.create({
          data: {
            cardType: card.card_type,
            priority: card.priority,
            title: card.title,
            body: card.body,
            evidenceJson: JSON.stringify(card.evidence),
            suggestedGptPrompt: card.suggested_gpt_prompt,
            relatedApplicationId: card.related_application_id,
            relatedInterviewId: card.related_interview_id,
            dedupeKey: card.dedupe_key,
            expiresAt: addHours(new Date(), card.expires_in_hours),
            state: "active",
          },
        });
        created += 1;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          duplicateSkipped += 1;
          continue;
        }

        throw error;
      }
    }

    await prisma.llmRun.update({
      where: { id: llmRun.id },
      data: {
        finishedAt: new Date(),
        cardsCreatedCount: created,
        error:
          validation.rejected.length > 0 || duplicateSkipped > 0
            ? JSON.stringify({
                rejected_count: validation.rejected.length,
                duplicate_skipped_count: duplicateSkipped,
              })
            : null,
      },
    });

    await finishRun(new Date());
    return { created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    await prisma.llmRun.update({
      where: { id: llmRun.id },
      data: {
        finishedAt: new Date(),
        error: message,
      },
    });

    await finishRun(new Date());
    return { created: 0, skippedReason: message };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown };
  return candidate.code === "P2002";
}

async function enforcePromptOnlyCardPolicy(): Promise<void> {
  await prisma.uiCard.updateMany({
    where: {
      state: "active",
      OR: [
        { cardType: { notIn: [...LOCAL_TRIAGE_CARD_TYPES] } },
        { suggestedGptPrompt: null },
        { suggestedGptPrompt: "" },
      ],
    },
    data: { state: "archived" },
  });
}

let schedulerStarted = false;

export function startWorkerScheduler(): void {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  const intervalHours = Number(process.env.LLM_WORKER_INTERVAL_HOURS ?? 6);
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;
  const queuePollMs = 60 * 1000;

  setInterval(() => {
    void runWorkerOnce();
  }, queuePollMs);

  setInterval(() => {
    void markWorkerPending();
  }, intervalMs);
}
