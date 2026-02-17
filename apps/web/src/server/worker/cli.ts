import { ensureDataLayout } from "@/lib/fileStore";
import { runWorkerOnce } from "./llmWorker";

async function main() {
  await ensureDataLayout();
  const result = await runWorkerOnce({ force: true });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
