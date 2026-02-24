import { queueWorkerRun } from "../worker/llmWorker";

export async function triggerWorkerFromWrite(): Promise<void> {
  await queueWorkerRun();
}
