/**
 * Prevents the BlockNote slash/suggestion menu from closing when scrolling
 * inside it with the mouse.
 *
 * Patches the compiled dist file that Vite actually reads, not the source .ts.
 * Finds the minified useDismiss alias from the @floating-ui/react import and
 * adds { ancestorScroll: false } to the call.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFile = path.join(
  __dirname,
  "../node_modules/@blocknote/react/dist/blocknote-react.js"
);

if (!fs.existsSync(distFile)) {
  console.warn(
    "fix-blocknote-slash-menu-scroll: dist file not found, skipping"
  );
  process.exit(0);
}

let content = fs.readFileSync(distFile, "utf8");

if (content.includes("ancestorScroll")) {
  console.log("fix-blocknote-slash-menu-scroll: already applied");
  process.exit(0);
}

// Find the minified alias for useDismiss, e.g. "useDismiss as Et"
const aliasMatch = content.match(/useDismiss\s+as\s+(\w+)/);
if (!aliasMatch) {
  console.warn(
    "fix-blocknote-slash-menu-scroll: could not find useDismiss alias, skipping"
  );
  process.exit(0);
}

const alias = aliasMatch[1];

// Replace every bare call  alias(x)  →  alias(x, { ancestorScroll: false })
// The pattern: alias followed by ( , a single identifier arg, then )
const callPattern = new RegExp(
  `\\b${alias}\\((\\w+)\\)`,
  "g"
);

const patched = content.replace(
  callPattern,
  `${alias}($1, { ancestorScroll: false })`
);

if (patched === content) {
  console.warn(
    "fix-blocknote-slash-menu-scroll: no matching call found, skipping"
  );
  process.exit(0);
}

fs.writeFileSync(distFile, patched);
console.log(
  "fix-blocknote-slash-menu-scroll: patched dist file (ancestorScroll: false)"
);
