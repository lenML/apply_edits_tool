function getLineStart(content: string, lineIndex: number): number {
  const lines = content.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    pos += lines[i].length + 1;
  }
  return pos;
}

function getLineEnd(content: string, lineIndex: number): number {
  const lines = content.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i <= lineIndex && i < lines.length; i++) {
    pos += lines[i].length + 1;
  }
  return pos - 1;
}

export function findSearchMatch(
  content: string,
  search: string,
): { start: number; end: number } | null {
  const contentLines = content.split(/\r?\n/);
  const searchLines = search.split(/\r?\n/);
  const normContent = contentLines.map((l) => l.trim());
  const normSearch = searchLines.map((l) => l.trim());

  for (let i = 0; i <= normContent.length - normSearch.length; i++) {
    let match = true;
    for (let j = 0; j < normSearch.length; j++) {
      if (normContent[i + j] !== normSearch[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        start: getLineStart(content, i),
        end: getLineEnd(content, i + normSearch.length - 1),
      };
    }
  }
  return null;
}

export function findMatchMatch(
  content: string,
  pattern: string,
): { start: number; end: number } | null {
  const contentLines = content.split(/\r?\n/);
  const patternLines = pattern.split(/\r?\n/);

  const anchors: { idx: number; line: string }[] = [];
  for (let i = 0; i < patternLines.length; i++) {
    const line = patternLines[i].trim();
    if (line !== "...") {
      anchors.push({ idx: i, line });
    }
  }
  if (anchors.length === 0) {
    throw new Error("MATCH pattern must contain at least one non-... anchor line");
  }

  const foundPositions: number[] = [];
  let currentLine = 0;
  for (const anchor of anchors) {
    let found = -1;
    for (let l = currentLine; l < contentLines.length; l++) {
      if (contentLines[l].trim() === anchor.line) {
        found = l;
        break;
      }
    }
    if (found === -1) return null;
    foundPositions.push(found);
    currentLine = found + 1;
  }

  const firstLine = foundPositions[0];
  const lastLine = foundPositions[foundPositions.length - 1];
  return {
    start: getLineStart(content, firstLine),
    end: getLineEnd(content, lastLine),
  };
}
