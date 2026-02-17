import type { WorkerSnapshot } from "../snapshot";

export interface LlmAdapter {
  generateCards(snapshot: WorkerSnapshot): Promise<string>;
}
