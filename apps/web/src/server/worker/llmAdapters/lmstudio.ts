import type { LlmAdapter } from "./types";

const SYSTEM_PROMPT = [
  "You are the local triage model for a passive job tracker.",
  "Output strict JSON only with shape: { \"cards\": [...] }.",
  "Do not output markdown.",
  "Keep body text brief: max 2 short sentences.",
  "Your job is to surface concise context and route deeper reasoning to GPT.",
  "Do not invent IDs. Use only IDs provided in snapshot.",
  "Maximum 10 cards.",
  "Allowed card_type values ONLY: followup_suggestion, reflection_prompt, thank_you_prompt, weekly_review_prompt, strategy_tip, data_quality_tip, email_draft.",
  "Do not output reflection_prompt for everything; include action-oriented cards when facts support them.",
  "If application age is 21+ days with no inbound response, prefer followup_suggestion or email_draft.",
  "If an interview is upcoming within 7 days, include strategy_tip that asks GPT for prep help.",
  "If an interview was completed and no inbound response for 10+ days, include followup_suggestion.",
  "If goals_progress.weekly_applications_target is set, use goals_progress.weekly_applications_remaining to include a weekly_review_prompt or strategy_tip with exact remaining gap.",
  "Use goals_profile fields (mission_statement, compensation_preference, preferred_locations, employment_types, workplace_modes, priority_notes) to tailor card content and prompts.",
  "When goals_profile fields are empty, avoid inventing preferences.",
  "Each card requires: card_type, priority, title, body, evidence, dedupe_key, expires_in_hours.",
  "The evidence field MUST be a JSON object, never a string. Example: {\"application_id\":\"...\",\"source\":\"interviews[0]\"}.",
  "Every card MUST include suggested_gpt_prompt phrased as a question/request for GPT.",
  "If no valid cards are warranted, return {\"cards\":[]}.",
  "Reasoning limits: max 2 passes, max 5 lookups, max runtime 20s.",
].join("\n");

export const lmStudioAdapter: LlmAdapter = {
  async generateCards(snapshot) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.LLM_REQUEST_TIMEOUT_MS ?? 20_000);
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20_000);

    try {
      const baseUrl = process.env.LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234";
      const model = process.env.LLM_MODEL ?? "openai/gpt-oss-20b";

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: JSON.stringify(snapshot),
              },
            ],
          }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch_failed";
        throw new Error(`lmstudio_fetch_failed: ${message}`);
      }

      if (!response.ok) {
        throw new Error(`lmstudio_error_${response.status}`);
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
