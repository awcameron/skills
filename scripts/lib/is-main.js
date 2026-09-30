// Tells a script whether it was run directly (`node scripts/x.js`) or imported (by a test).
//
// Compares real file paths, not `import.meta.url` against `file://${process.argv[1]}`: the URL
// form percent-encodes spaces and other characters, so that string comparison is false under a
// path like `~/My Projects/skills` and the script silently does nothing. realpath also makes a
// symlinked path (e.g. macOS's /tmp -> /private/tmp) compare equal to its target.

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** True when the module at `importMetaUrl` is the script node was started with. */
export function isMain(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(resolve(argv1));
  } catch {
    return false;
  }
}
