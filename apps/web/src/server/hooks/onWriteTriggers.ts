import { queueWorkerRun, runWorkerOnce } from "../worker/llmWorker";

export async function triggerWorkerFromWrite(): Promise<void> {
  await queueWorkerRun();
  await runWorkerOnce();
}
