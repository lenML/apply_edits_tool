// ── Conflict markers ──

export const MARKER_SEARCH = "<<<<<<<";
export const MARKER_MATCH = "<<<<<<<";
export const MARKER_SEPARATOR = "=======";
export const MARKER_REPLACE = ">>>>>>>";

// ── Keywords ──

export const KW_SEARCH = "SEARCH";
export const KW_MATCH = "MATCH";
export const KW_REPLACE = "REPLACE";

// ── Combined headers / footers ──

export const HDR_SEARCH = `${MARKER_SEARCH} ${KW_SEARCH}`;
export const HDR_MATCH = `${MARKER_MATCH} ${KW_MATCH}`;
export const HDR_REPLACE = `${MARKER_REPLACE} ${KW_REPLACE}`;

// ── Code fence ──

export const FENCE = "```";

// ── Helpers ──

export function isMarkerLine(s: string): boolean {
  return (
    s.startsWith(FENCE) ||
    s.startsWith(MARKER_SEARCH) ||
    s.startsWith(MARKER_SEPARATOR) ||
    s.startsWith(MARKER_REPLACE)
  );
}

export function isSearchLine(s: string): boolean {
  return s.trim().startsWith(MARKER_SEARCH);
}

export function isReplaceLine(s: string): boolean {
  return s.trim().startsWith(MARKER_REPLACE);
}
