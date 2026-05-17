/**
 * Autofixes common formatting issues in edit commands before parsing,
 * to improve the success rate of edit application.
 */

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

  while (i < lines.length) {
    const cur = lines[i];
    const trimmed = cur.trim();

    if (trimmed.startsWith("```")) {
      // Look ahead past blank lines for a non-blank, non-fence, non-marker line
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (
        j < lines.length &&
        !lines[j].trim().startsWith("```") &&
        !lines[j].trim().startsWith("<<<<<<<") &&
        !lines[j].trim().startsWith("=======") &&
        !lines[j].trim().startsWith(">>>>>>>")
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

function isMarkerLine(s: string): boolean {
  return (
    s.startsWith("```") ||
    s.startsWith("<<<<<<<") ||
    s.startsWith("=======") ||
    s.startsWith(">>>>>>>")
  );
}

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
      !trimmed.startsWith("```") &&
      !trimmed.startsWith("<<<<<<<") &&
      !trimmed.startsWith(">>>>>>>") &&
      !trimmed.startsWith("=======")
    ) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (
        j < lines.length &&
        lines[j].trim().startsWith("<<<<<<<")
      ) {
        // Missing fences — wrap all blocks until next file path or end
        out.push(lines[i]); // file path

        // Insert opening fence before the first <<<<<<<
        out.push("");
        out.push("```");

        // Find the last >>>>>>> before the next file-path-like line
        let endIdx = -1;
        let afterLastRepl = false;
        for (let scan = j; scan < lines.length; scan++) {
          const st = lines[scan].trim();
          if (st.startsWith(">>>>>>>")) {
            endIdx = scan;
            afterLastRepl = true;
          } else if (afterLastRepl && st && !isMarkerLine(st)) {
            break; // next file path
          } else if (st.startsWith("<<<<<<<")) {
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
        out.push("```");

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
      if (trimmed === "<<<<<<<") {
        return line.replace("<<<<<<<", "<<<<<<< SEARCH");
      }
      if (trimmed.startsWith("<<<<<<<") && !trimmed.includes("SEARCH") && !trimmed.includes("MATCH")) {
        return line.replace("<<<<<<<", "<<<<<<< SEARCH");
      }
      if (trimmed === ">>>>>>>") {
        return line.replace(">>>>>>>", ">>>>>>> REPLACE");
      }
      if (trimmed.startsWith(">>>>>>>") && !trimmed.includes("REPLACE")) {
        return line.replace(">>>>>>>", ">>>>>>> REPLACE");
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

function fixSearchIndentation(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("<<<<<<< SEARCH") || trimmed.startsWith("<<<<<<< MATCH")) {
      out.push(lines[i]);
      i++;

      // Collect search lines until "======="
      const searchLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "=======") {
        searchLines.push(lines[i]);
        i++;
      }

      // Compute minimum common leading whitespace among non-empty lines
      const nonEmpty = searchLines.filter((l) => l.trim().length > 0);
      if (nonEmpty.length > 0) {
        const indentLevels = nonEmpty.map((l) => l.length - l.trimStart().length);
        const minIndent = Math.min(...indentLevels);
        if (minIndent > 0) {
          for (const sl of searchLines) {
            if (sl.trim().length > 0) {
              out.push(sl.slice(minIndent));
            } else {
              out.push(sl);
            }
          }
          // Push "=======" and continue
          if (i < lines.length) {
            out.push(lines[i]);
            i++;
          }
          continue;
        }
      }

      // No dedent needed — flush collected search lines
      out.push(...searchLines);
      if (i < lines.length) {
        out.push(lines[i]);
        i++;
      }
      continue;
    }
    out.push(lines[i]);
    i++;
  }

  return out.join("\n");
}

// ── Public entry point ──

/**
 * Applies all autofixes to the raw edit command string, returning a
 * corrected version that is more likely to parse and match successfully.
 *
 * Fixes are applied in order:
 *   1. File path inside code fence → move path before fence
 *   2. Missing code fences → wrap blocks in ```
 *   3. Missing SEARCH/REPLACE keywords → default to SEARCH
 *   4. Excessive search-text indentation → strip common leading whitespace
 */
export function autofixInput(input: string): string {
  let result = input;
  result = fixPathInsideFence(result);
  result = addMissingFences(result);
  result = fixMarkers(result);
  result = fixSearchIndentation(result);
  return result;
}
