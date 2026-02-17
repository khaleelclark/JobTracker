import fs from "node:fs/promises";
import { resolveControlFilePath } from "../lib/paths";
import { truncateJsonString } from "../lib/truncate";

export async function getControlFile() {
  const path = resolveControlFilePath();

  try {
    const text = await fs.readFile(path, "utf8");
    return { control_file: { path, text: truncateJsonString(text, 5000) } };
  } catch {
    return { control_file: { path, text: "" } };
  }
}
