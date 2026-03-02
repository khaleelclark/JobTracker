import type { LlmAdapter } from "./types";

const SYSTEM_PROMPT = [
  "You are the local triage model for a passive job tracker.",
  "Output strict JSON only: { \"cards\": [...] }.",
  "Never include markdown.",
  "Keep body text brief: max 2 short sentences.",
  "Route deeper reasoning and decisions to GPT + user.",
  "Use only IDs present in input snapshot.",
  "Allowed card_type values ONLY: followup_suggestion, reflection_prompt, thank_you_prompt, weekly_review_prompt, strategy_tip, data_quality_tip, email_draft.",
  "Do not output reflection_prompt for everything; include action-oriented cards when facts support them.",
  "If application age is 21+ days with no inbound response, prefer followup_suggestion or email_draft.",
  "If an interview is upcoming within 7 days, include strategy_tip that asks GPT for prep help.",
  "If an interview was completed and no inbound response for 10+ days, include followup_suggestion.",
  "If goals_progress.weekly_applications_target is set, use goals_progress.weekly_applications_remaining to include a weekly_review_prompt or strategy_tip with exact remaining gap.",
  "Use goals_profile fields (mission_statement, compensation_preference, preferred_locations, employment_types, workplace_modes, priority_notes) to tailor card content and prompts.",
  "Use recent_communications facts (including company-level communication when available) as valid evidence signals.",
  "When goals_profile fields are empty, avoid inventing preferences.",
  "Every card must include suggested_gpt_prompt.",
].join("\n");

export const llamaCppAdapter: LlmAdapter = {
  async generateCards(snapshot) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const baseUrl = process.env.LLAMACPP_BASE_URL ?? "http://127.0.0.1:8080";
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.LLM_MODEL ?? "local-model",
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

      if (!response.ok) {
        throw new Error(`llamacpp_error_${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content ?? '{"cards": []}';
    } finally {
      clearTimeout(timeout);
    }
  },
};
