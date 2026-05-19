/**
 * Autofixes common formatting issues in edit commands before parsing,
 * to improve the success rate of edit application.
 */

import {
  MARKER_SEARCH,
  MARKER_SEPARATOR,
  MARKER_REPLACE,
  FENCE,
  HDR_SEARCH,
  HDR_REPLACE,
  KW_SEARCH,
  KW_MATCH,
  KW_REPLACE,
  isMarkerLine,
} from "./symbols.js";

// ── Fix 1: File path mistakenly placed inside code fence ──
//
// Before:                        After:
//   ```python                      path/to/file.py
//   path/to/file.py                ```python
//   <<<<<<< SEARCH                 <<<<<<< SEARCH
//   old code                       old code
//   =======                        =======
//   new code                       new code
//   >>>>>>> REPLACE                >>>>>>> REPLACE
//   ```                            ```

function fixPathInsideFence(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let i = 0;
  let insideBlockDepth = 0;

  while (i < lines.length) {
    const cur = lines[i];
    const trimmed = cur.trim();

    // Track SEARCH/MATCH/REPLACE block boundaries
    if (trimmed.startsWith(MARKER_SEARCH)) {
      insideBlockDepth++;
    } else if (trimmed.startsWith(MARKER_REPLACE)) {
      insideBlockDepth--;
    }

    if (insideBlockDepth === 0 && trimmed.startsWith(FENCE)) {
      // Look ahead past blank lines for a non-blank, non-fence, non-marker line
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (
        j < lines.length &&
        !lines[j].trim().startsWith(FENCE) &&
        !lines[j].trim().startsWith(MARKER_SEARCH) &&
        !lines[j].trim().startsWith(MARKER_SEPARATOR) &&
        !lines[j].trim().startsWith(MARKER_REPLACE)
      ) {
        // Move file path before the fence
        out.push(lines[j]);
        out.push(lines[i]);
        i = j + 1;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }

  return out.join("\n");
}

// ── Fix 2: Missing code fences around SEARCH/REPLACE blocks ──
//
// Before:                        After:
//   path/to/file.py                path/to/file.py
//   <<<<<<< SEARCH                 ```
//   old code                       <<<<<<< SEARCH
//   =======                        old code
//   new code                       =======
//   >>>>>>> REPLACE                new code
//                                  >>>>>>> REPLACE
//                                  ```

function addMissingFences(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];
    const trimmed = cur.trim();

    // Check if this looks like a file path without a following fence
    if (
      trimmed &&
      !trimmed.startsWith(FENCE) &&
      !trimmed.startsWith(MARKER_SEARCH) &&
      !trimmed.startsWith(MARKER_REPLACE) &&
      !trimmed.startsWith(MARKER_SEPARATOR)
    ) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && lines[j].trim().startsWith(MARKER_SEARCH)) {
        // Missing fences — wrap all blocks until next file path or end
        out.push(lines[i]); // file path

        // Insert opening fence before the first <<<<<<<
        out.push("");
        out.push(FENCE);

        // Find the last >>>>>>> before the next file-path-like line
        let endIdx = -1;
        let afterLastRepl = false;
        for (let scan = j; scan < lines.length; scan++) {
          const st = lines[scan].trim();
          if (st.startsWith(MARKER_REPLACE)) {
            endIdx = scan;
            afterLastRepl = true;
          } else if (afterLastRepl && st && !isMarkerLine(st)) {
            break; // next file path
          } else if (st.startsWith(MARKER_SEARCH)) {
            afterLastRepl = false;
          }
        }

        if (endIdx === -1) {
          // Shouldn't happen if input is somewhat valid, but fallback
          out.push(lines[j]);
          i = j + 1;
          continue;
        }

        // Output the blocks
        for (let k = j; k <= endIdx; k++) {
          out.push(lines[k]);
        }

        // Insert closing fence
        out.push(FENCE);

        i = endIdx + 1;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }

  return out.join("\n");
}

// ── Fix 3: Missing SEARCH/REPLACE keywords on conflict markers ──
//
// Before:         After:
//   <<<<<<<         <<<<<<< SEARCH
//   old code        old code
//   =======         =======
//   new code        new code
//   >>>>>>>         >>>>>>> REPLACE

function fixMarkers(input: string): string {
  return input
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === MARKER_SEARCH) {
        return line.replace(MARKER_SEARCH, HDR_SEARCH);
      }
      if (
        trimmed.startsWith(MARKER_SEARCH) &&
        !trimmed.includes(KW_SEARCH) &&
        !trimmed.includes(KW_MATCH)
      ) {
        return line.replace(MARKER_SEARCH, HDR_SEARCH);
      }
      if (trimmed === MARKER_REPLACE) {
        return line.replace(MARKER_REPLACE, HDR_REPLACE);
      }
      if (trimmed.startsWith(MARKER_REPLACE) && !trimmed.includes(KW_REPLACE)) {
        return line.replace(MARKER_REPLACE, HDR_REPLACE);
      }
      return line;
    })
    .join("\n");
}

// ── Fix 4: Normalize excessive leading whitespace in SEARCH text ──
//
// Strips the common minimum indentation from SEARCH block lines so that
// the existing trim-based matcher has an easier time.
//
// Before:                        After:
//   <<<<<<< SEARCH                 <<<<<<< SEARCH
//           def foo():             def foo():
//               pass               pass
//   =======                        =======
//   new code                       new code
//   >>>>>>> REPLACE                >>>>>>> REPLACE

// ── Public entry point ──

/**
 * Applies all autofixes to the raw edit command string, returning a
 * corrected version that is more likely to parse and match successfully.
 *
 * Fixes are applied in order:
 *   1. File path inside code fence → move path before fence
 *   2. Missing code fences → wrap blocks in ```
 *   3. Missing SEARCH/REPLACE keywords → default to SEARCH
 */
export function autofixInput(input: string): string {
  let result = input;
  // Normalize CRLF to LF before processing
  result = result.replace(/\r\n/g, "\n");
  result = fixPathInsideFence(result);
  result = addMissingFences(result);
  result = fixMarkers(result);
  return result;
}
