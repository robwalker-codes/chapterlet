import { writeFile } from "node:fs/promises";
import { publicJsonSchema, aiPrompt } from "../src/schemas/book.ts";
await writeFile(
  "docs/book.schema.json",
  JSON.stringify(publicJsonSchema, null, 2) + "\n",
);
await writeFile("docs/ai-generation-prompt.txt", aiPrompt + "\n");
