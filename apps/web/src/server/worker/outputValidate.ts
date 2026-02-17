import {
  LOCAL_TRIAGE_CARD_TYPES,
  LOCAL_TRIAGE_MAX_BODY_LENGTH,
  MAX_CARD_BODY_LENGTH,
  MAX_CARD_TITLE_LENGTH,
  MAX_CARDS_PER_RUN,
  workerResponseSchema,
  type WorkerCardInput,
} from "@job-tracker/shared";
import { prisma } from "@/lib/db";

interface ValidationResult {
  accepted: WorkerCardInput[];
  rejected: Array<{ reason: string; card: unknown }>;
}

const promptOnlyMode = (process.env.LOCAL_LLM_PROMPT_ONLY ?? "true").toLowerCase() !== "false";
const promptOnlyMaxBodyLength = Number(process.env.LOCAL_LLM_MAX_BODY_CHARS ?? LOCAL_TRIAGE_MAX_BODY_LENGTH);
const allowedPromptOnlyTypes = new Set<string>(LOCAL_TRIAGE_CARD_TYPES);

export async function validateWorkerOutput(raw: string): Promise<ValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      accepted: [],
      rejected: [{ reason: "invalid_json", card: raw }],
    };
  }

  const normalized = normalizeWorkerPayload(parsed);
  const contract = workerResponseSchema.safeParse(normalized);
  if (!contract.success) {
    return {
      accepted: [],
      rejected: [{ reason: "schema_validation_failed", card: contract.error.flatten() }],
    };
  }

  const cards = contract.data.cards.slice(0, MAX_CARDS_PER_RUN);
  const activeDedupe = new Set(
    (
      await prisma.uiCard.findMany({
        where: { state: "active" },
        select: { dedupeKey: true },
      })
    ).map((row) => row.dedupeKey),
  );

  const applicationIds = new Set(
    (
      await prisma.application.findMany({
        select: { id: true },
      })
    ).map((row) => row.id),
  );

  const interviewIds = new Set(
    (
      await prisma.interview.findMany({
        select: { id: true },
      })
    ).map((row) => row.id),
  );

  const accepted: WorkerCardInput[] = [];
  const rejected: Array<{ reason: string; card: unknown }> = [];
  const seenInBatch = new Set<string>();

  for (const card of cards) {
    if (seenInBatch.has(card.dedupe_key)) {
      rejected.push({ reason: "duplicate_dedupe_key_in_batch", card });
      continue;
    }

    if (activeDedupe.has(card.dedupe_key)) {
      rejected.push({ reason: "duplicate_dedupe_key_active", card });
      continue;
    }

    if (card.related_application_id && !applicationIds.has(card.related_application_id)) {
      rejected.push({ reason: "unknown_related_application_id", card });
      continue;
    }

    if (card.related_interview_id && !interviewIds.has(card.related_interview_id)) {
      rejected.push({ reason: "unknown_related_interview_id", card });
      continue;
    }

    if (!card.evidence || Object.keys(card.evidence).length === 0) {
      rejected.push({ reason: "missing_evidence", card });
      continue;
    }

    if (promptOnlyMode) {
      if (!allowedPromptOnlyTypes.has(card.card_type)) {
        rejected.push({ reason: "card_type_not_allowed_in_prompt_only_mode", card });
        continue;
      }

      if (!card.suggested_gpt_prompt || card.suggested_gpt_prompt.trim().length === 0) {
        rejected.push({ reason: "missing_suggested_gpt_prompt", card });
        continue;
      }
    }

    if (card.title.length > MAX_CARD_TITLE_LENGTH || card.body.length > MAX_CARD_BODY_LENGTH) {
      rejected.push({ reason: "text_too_long", card });
      continue;
    }

    seenInBatch.add(card.dedupe_key);
    accepted.push(card);
  }

  return { accepted, rejected };
}

function normalizeWorkerPayload(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const base = input as { cards?: unknown };
  if (!Array.isArray(base.cards)) {
    return input;
  }

  return {
    ...base,
    cards: base.cards.map((card) => normalizeCard(card)),
  };
}

function normalizeCard(card: unknown): unknown {
  if (!card || typeof card !== "object") {
    return card;
  }

  const base = card as Record<string, unknown>;
  const body = normalizeBody(base.body);
  const title = typeof base.title === "string" ? base.title.trim() : base.title;
  return {
    ...base,
    title,
    body,
    priority: normalizePriority(base.priority),
    evidence: normalizeEvidence(base.evidence),
    suggested_gpt_prompt: normalizeSuggestedPrompt(
      base.suggested_gpt_prompt,
      base.card_type,
      title,
      body,
      base.evidence,
      base.related_application_id,
      base.related_interview_id,
    ),
  };
}

function normalizePriority(value: unknown): unknown {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "low" || normalized === "medium" || normalized === "high") {
      return normalized;
    }
    return value;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return value;
  }

  if (value <= 1) {
    return "low";
  }

  if (value >= 3) {
    return "high";
  }

  return "medium";
}

function normalizeEvidence(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return { source: value.trim() };
  }

  return value;
}

function normalizeBody(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!promptOnlyMode) {
    return trimmed;
  }

  const max = Number.isFinite(promptOnlyMaxBodyLength) ? promptOnlyMaxBodyLength : LOCAL_TRIAGE_MAX_BODY_LENGTH;
  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, max - 3))}...`;
}

function normalizeSuggestedPrompt(
  value: unknown,
  cardType: unknown,
  title: unknown,
  body: unknown,
  evidence: unknown,
  relatedApplicationId: unknown,
  relatedInterviewId: unknown,
): unknown {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (!promptOnlyMode) {
    return value;
  }

  const safeTitle = typeof title === "string" ? title.trim() : "this job-search update";
  const safeBody = typeof body === "string" ? body.trim() : "";
  const evidenceObj =
    evidence && typeof evidence === "object" && !Array.isArray(evidence) ? (evidence as Record<string, unknown>) : null;
  const appId =
    typeof relatedApplicationId === "string"
      ? relatedApplicationId
      : typeof evidenceObj?.application_id === "string"
        ? String(evidenceObj.application_id)
        : null;
  const interviewId =
    typeof relatedInterviewId === "string"
      ? relatedInterviewId
      : typeof evidenceObj?.interview_id === "string"
        ? String(evidenceObj.interview_id)
        : null;
  const source = typeof evidenceObj?.source === "string" ? evidenceObj.source : null;

  const contextParts = [appId ? `application ${appId}` : null, interviewId ? `interview ${interviewId}` : null, source]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(", ");

  const contextPrefix = contextParts ? `Context: ${contextParts}. ` : "";
  const normalizedType = typeof cardType === "string" ? cardType.trim().toLowerCase() : "";

  if (normalizedType === "followup_suggestion") {
    return `${contextPrefix}Given these tracked facts, draft two follow-up options (brief and detailed) and explain timing tradeoffs for sending now versus waiting a few days.`.trim();
  }

  if (normalizedType === "strategy_tip") {
    return `${contextPrefix}Given these tracked facts, what interview prep checklist, likely question themes, and practice prompts should I use for this role?`.trim();
  }

  if (normalizedType === "thank_you_prompt") {
    return `${contextPrefix}Please draft a concise thank-you message aligned to this interview context, including one personalized callback to the discussion.`.trim();
  }

  if (normalizedType === "email_draft") {
    return `${contextPrefix}Please draft a professional email based on these facts, and provide one concise version plus one more detailed version.`.trim();
  }

  if (normalizedType === "data_quality_tip") {
    return `${contextPrefix}From these facts, what specific fields or events should I log next so my job-search dataset is more complete and useful?`.trim();
  }

  if (normalizedType === "weekly_review_prompt") {
    return `${contextPrefix}Given these tracked facts, summarize this week's job-search changes and identify the most important open threads to review.`.trim();
  }

  return `${contextPrefix}Given my tracked facts, help me analyze: ${safeTitle}. ${safeBody}`.trim();
}
