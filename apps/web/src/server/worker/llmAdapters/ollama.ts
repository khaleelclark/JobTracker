import type { LlmAdapter } from "./types";

const SYSTEM_PROMPT = [
  "You are the local triage model for a passive job tracker.",
  "Output JSON only with shape: { \"cards\": [...] }.",
  "Do not output any text outside JSON.",
  "Keep body text brief: max 2 short sentences.",
  "Route deeper reasoning and decisions to GPT + user.",
  "Do not invent IDs. Use only IDs provided in snapshot.",
  "Maximum 10 cards.",
  "Allowed card_type values ONLY: followup_suggestion, reflection_prompt, thank_you_prompt, weekly_review_prompt, strategy_tip, data_quality_tip, email_draft.",
  "Do not output reflection_prompt for everything; include action-oriented cards when facts support them.",
  "If application age is 21+ days with no inbound response, prefer followup_suggestion or email_draft.",
  "If an interview is upcoming within 7 days, include strategy_tip that asks GPT for prep help.",
  "If an interview was completed and no inbound response for 10+ days, include followup_suggestion.",
  "Each card requires: card_type, priority, title, body, evidence, dedupe_key, expires_in_hours.",
  "Every card must include suggested_gpt_prompt with a clear question to ask GPT.",
  "Reasoning limits: max 2 passes, max 5 lookups, max runtime 20s.",
].join("\n");

export const ollamaAdapter: LlmAdapter = {
  async generateCards(snapshot) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const model = process.env.LLM_MODEL ?? "qwen3:8b";
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
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
        throw new Error(`ollama_error_${response.status}`);
      }

      const json = (await response.json()) as {
        message?: { content?: string };
      };

      return json.message?.content ?? '{"cards": []}';
    } finally {
      clearTimeout(timeout);
    }
  },
};
