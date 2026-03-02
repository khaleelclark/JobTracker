import type { LlmAdapter } from "./types";

const SYSTEM_PROMPT = [
  "You are the insights model for a passive job tracker.",
  "Output strict JSON only with shape: { \"cards\": [...] }.",
  "Do not output markdown.",
  "Keep body text brief: max 2 short sentences.",
  "Your job is to surface concise context and route deeper reasoning to GPT.",
  "Do not invent IDs. Use only IDs provided in snapshot.",
  "Maximum 10 cards.",
  "Generate 3-6 cards when enough facts exist.",
  "Allowed card_type values ONLY: followup_suggestion, reflection_prompt, thank_you_prompt, weekly_review_prompt, strategy_tip, data_quality_tip, email_draft.",
  "Each card requires: card_type, priority, title, body, evidence, dedupe_key, expires_in_hours.",
  "The evidence field MUST be a JSON object, never a string. Example: {\"application_id\":\"...\",\"source\":\"interviews[0]\"}.",
  "Every card MUST include suggested_gpt_prompt phrased as a question/request for GPT.",
  "Card mix requirements:",
  "- Do not output reflection_prompt for everything.",
  "- Prefer action-oriented cards when factual triggers exist.",
  "- If an application is 21+ days old with no inbound response, produce followup_suggestion or email_draft.",
  "- If an interview is upcoming within 7 days, produce strategy_tip asking GPT for focused prep help.",
  "- If an interview was completed and there is no inbound response for 10+ days, produce followup_suggestion and optionally thank_you_prompt/email_draft.",
  "- If goals_progress.weekly_applications_target is set, use goals_progress.weekly_applications_remaining to generate a weekly_review_prompt or strategy_tip referencing exact remaining gap.",
  "- Use goals_profile fields (mission_statement, compensation_preference, preferred_locations, employment_types, workplace_modes, priority_notes) to tailor titles, body text, and suggested_gpt_prompt.",
  "- When goals_profile fields are empty, avoid inventing preferences.",
  "- Use reflection_prompt mainly for post-event learning moments, not as the default card type.",
  "Safety and scope:",
  "- Do not rank applications or declare a single best decision.",
  "- Do not present app-side strategy as final; route decisions to GPT + user.",
  "- Body text should describe factual context, while suggested_gpt_prompt carries the call-to-action.",
  "Tailoring requirements:",
  "- Anchor cards to a specific application or interview whenever possible.",
  "- Title must include concrete context (company, role, round label, or event).",
  "- Body must cite at least one concrete fact from snapshot (status, timestamp, channel, outcome, or reflection note).",
  "- Use recent_communications facts (including company-level communication when available) as valid evidence signals.",
  "- suggested_gpt_prompt must include concrete facts before asking GPT for next-step help.",
  "- dedupe_key must be specific to factual anchor (include card_type + app/interview id fragment + signal).",
  "If no valid cards are warranted, return {\"cards\":[]}.",
  "Reasoning limits: max 2 passes, max 5 lookups, max runtime 20s.",
].join("\n");

export const openAiAdapter: LlmAdapter = {
  async generateCards(snapshot) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? 20_000);
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20_000);

    try {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("openai_api_key_missing");
      }

      const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
      const model = process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: buildUserPrompt(snapshot),
              },
            ],
          }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch_failed";
        throw new Error(`openai_fetch_failed: ${message}`);
      }

      if (!response.ok) {
        throw new Error(`openai_error_${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      return extractJsonPayload(content);
    } finally {
      clearTimeout(timeout);
    }
  },
};

function extractJsonPayload(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return '{"cards": []}';
  }

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const withoutTags = trimmed.replace(/<\|[^|]+?\|>/g, " ").trim();
  const match = withoutTags.match(/\{[\s\S]*\}/);

  if (!match) {
    return '{"cards": []}';
  }

  return match[0];
}

function buildUserPrompt(snapshot: unknown): string {
  return [
    "Use only the snapshot facts below.",
    "Return JSON object only.",
    "Focus on tailored insight prompts, not generic reminders.",
    "Snapshot:",
    JSON.stringify(snapshot),
  ].join("\n");
}
