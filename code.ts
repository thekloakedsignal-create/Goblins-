import { startJobWorker } from "./src/agent/worker.ts";

startJobWorker().catch((err) => {
  console.error("Worker failed to boot:", err);
  process.exit(1);
});