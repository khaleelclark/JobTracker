import { ollamaAdapter } from "./ollama";
import { llamaCppAdapter } from "./llamacpp";
import { lmStudioAdapter } from "./lmstudio";
import { openAiAdapter } from "./openai";
import type { LlmAdapter } from "./types";

export function getLlmAdapter(): LlmAdapter {
  const runtime = (process.env.LLM_RUNTIME ?? "ollama").toLowerCase();

  if (runtime === "lmstudio") {
    return lmStudioAdapter;
  }

  if (runtime === "llamacpp") {
    return llamaCppAdapter;
  }

  if (runtime === "openai") {
    return openAiAdapter;
  }

  return ollamaAdapter;
}
