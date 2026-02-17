import { prisma } from "@/lib/db";

export interface WorkerQueueConfig {
  minGapMinutes: number;
  maxRunsPerHour: number;
}

function configFromEnv(): WorkerQueueConfig {
  return {
    minGapMinutes: Number(process.env.LLM_WORKER_MIN_GAP_MINUTES ?? 10),
    maxRunsPerHour: 3,
  };
}

export async function ensureRunQueueRow(): Promise<void> {
  await prisma.llmRunQueue.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, pending: false },
  });
}

export async function markWorkerPending(): Promise<void> {
  await ensureRunQueueRow();
  await prisma.llmRunQueue.update({
    where: { id: 1 },
    data: { pending: true },
  });
}

export async function canRunNow(now = new Date()): Promise<{ allowed: boolean; reason?: string }> {
  await ensureRunQueueRow();

  const cfg = configFromEnv();
  const queue = await prisma.llmRunQueue.findUnique({ where: { id: 1 } });

  if (!queue) {
    return { allowed: true };
  }

  if (queue.cooldownUntil && queue.cooldownUntil > now) {
    return { allowed: false, reason: "cooldown" };
  }

  if (queue.lastRunStartedAt) {
    const minNextRunTs = queue.lastRunStartedAt.getTime() + cfg.minGapMinutes * 60 * 1000;
    if (now.getTime() < minNextRunTs) {
      return { allowed: false, reason: "min_gap" };
    }
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentRuns = await prisma.llmRun.count({
    where: {
      startedAt: { gte: oneHourAgo },
    },
  });

  if (recentRuns >= cfg.maxRunsPerHour) {
    return { allowed: false, reason: "max_runs_per_hour" };
  }

  return { allowed: true };
}

export async function beginRun(now = new Date()): Promise<void> {
  await ensureRunQueueRow();

  await prisma.llmRunQueue.update({
    where: { id: 1 },
    data: {
      pending: false,
      lastRunStartedAt: now,
    },
  });
}

export async function finishRun(now = new Date()): Promise<void> {
  const minGapMinutes = Number(process.env.LLM_WORKER_MIN_GAP_MINUTES ?? 10);
  const cooldownUntil = new Date(now.getTime() + minGapMinutes * 60 * 1000);

  await prisma.llmRunQueue.update({
    where: { id: 1 },
    data: {
      lastRunFinishedAt: now,
      cooldownUntil,
    },
  });
}

export async function isPending(): Promise<boolean> {
  await ensureRunQueueRow();
  const queue = await prisma.llmRunQueue.findUnique({ where: { id: 1 } });
  return Boolean(queue?.pending);
}
